import { describe, expect, it } from 'vitest';
import {
  DEAD_FREQUENCY_GAME_ID,
  FIRST_CLUE_ID,
  FIRST_TAPE_ID,
  MEMORY_ID,
  SECOND_CLUE_ID,
  SECOND_TAPE_ID,
  SECRET_BOX_ID,
  SHADOW_FIGHT_GAME_ID,
  SNAKE_GAME_ID,
  THIRD_CLUE_ID,
  THIRD_TAPE_ID,
  type GameEvent,
  type GameState,
} from './contracts';
import { createInitialState, gameReducer, parseSave } from './gameReducer';

const apply = (state: GameState, events: readonly GameEvent[]): GameState =>
  events.reduce((current, event) => gameReducer(current, event), state);

/** The whole story path, in the order the player can reach it. */
const ACT_ONE: GameEvent[] = [
  { type: 'TAPE_COLLECTED', tapeId: FIRST_TAPE_ID },
  { type: 'VHS_CLUE_FOUND', tapeId: FIRST_TAPE_ID, clueId: FIRST_CLUE_ID },
  { type: 'ARCADE_WON', gameId: SNAKE_GAME_ID, score: 1200 },
];
const ACT_TWO: GameEvent[] = [
  { type: 'TAPE_COLLECTED', tapeId: SECOND_TAPE_ID },
  { type: 'VHS_CLUE_FOUND', tapeId: SECOND_TAPE_ID, clueId: SECOND_CLUE_ID },
  { type: 'ARCADE_WON', gameId: SHADOW_FIGHT_GAME_ID, score: 900 },
];
const ACT_THREE: GameEvent[] = [
  { type: 'TAPE_COLLECTED', tapeId: THIRD_TAPE_ID },
  { type: 'VHS_CLUE_FOUND', tapeId: THIRD_TAPE_ID, clueId: THIRD_CLUE_ID },
  { type: 'ARCADE_WON', gameId: DEAD_FREQUENCY_GAME_ID, score: 800 },
];
const POLAROIDS: GameEvent[] = [FIRST_TAPE_ID, SECOND_TAPE_ID, THIRD_TAPE_ID].map((tapeId) => ({
  type: 'PHOTO_CAPTURED' as const,
  tapeId,
  photoId: `${tapeId}-memory`,
}));
const ALL_ARCADES: GameEvent[] = [...ACT_ONE, ...ACT_TWO, ...ACT_THREE];
const ARCHIVE_READY: GameEvent[] = [...ALL_ARCADES];

describe('game foundation state contracts', () => {
  it('does not reveal a clue before collecting its tape', () => {
    const original = createInitialState();
    expect(gameReducer(original, { type: 'VHS_CLUE_FOUND', tapeId: FIRST_TAPE_ID, clueId: FIRST_CLUE_ID })).toEqual(original);
  });

  it('never duplicates collected tapes or clues', () => {
    const withClue = apply(createInitialState(), ACT_ONE.slice(0, 2));
    expect(gameReducer(withClue, { type: 'TAPE_COLLECTED', tapeId: FIRST_TAPE_ID }).collectedTapes).toHaveLength(1);
    expect(gameReducer(withClue, { type: 'VHS_CLUE_FOUND', tapeId: FIRST_TAPE_ID, clueId: FIRST_CLUE_ID }).discoveredClues).toHaveLength(1);
  });

  it('refuses to take a tape before the previous act clue is found', () => {
    expect(gameReducer(createInitialState(), { type: 'TAPE_COLLECTED', tapeId: SECOND_TAPE_ID }).collectedTapes).toEqual([]);
    const afterActOne = apply(createInitialState(), ACT_ONE.slice(0, 2));
    expect(gameReducer(afterActOne, { type: 'TAPE_COLLECTED', tapeId: THIRD_TAPE_ID }).collectedTapes).toEqual([FIRST_TAPE_ID]);
  });

  it('refuses a cabinet win before its clue is found', () => {
    const afterTapeOne = apply(createInitialState(), ACT_ONE.slice(0, 1));
    expect(gameReducer(afterTapeOne, { type: 'ARCADE_WON', gameId: SHADOW_FIGHT_GAME_ID, score: 10 }).completedArcades).toEqual([]);
  });

  it('refuses Archive 09 until all clues are found and all cabinets are beaten', () => {
    expect(gameReducer(createInitialState(), { type: 'MEMORY_RESTORED', memoryId: MEMORY_ID }).endingUnlocked).toBe(false);
    const onlySnake = apply(createInitialState(), ACT_ONE);
    expect(gameReducer(onlySnake, { type: 'MEMORY_RESTORED', memoryId: MEMORY_ID }).restoredMemories).toEqual([]);
    const ready = apply(createInitialState(), ARCHIVE_READY);
    expect(gameReducer(ready, { type: 'MEMORY_RESTORED', memoryId: MEMORY_ID }).endingUnlocked).toBe(true);
  });

  it('keeps the secret box locked until the three cabinets are beaten', () => {
    const partial = apply(createInitialState(), [...ACT_ONE, ...ACT_TWO]);
    expect(gameReducer(partial, { type: 'SECRET_BOX_COLLECTED', boxId: SECRET_BOX_ID }).collectedSecrets).toEqual([]);
    const done = apply(createInitialState(), ARCHIVE_READY);
    expect(gameReducer(done, { type: 'SECRET_BOX_COLLECTED', boxId: SECRET_BOX_ID }).collectedSecrets).toEqual([SECRET_BOX_ID]);
  });

  it('accepts only the Polaroid id each tape offers', () => {
    const withTape = apply(createInitialState(), ACT_ONE.slice(0, 1));
    expect(gameReducer(withTape, { type: 'PHOTO_CAPTURED', tapeId: FIRST_TAPE_ID, photoId: 'friends' })).toEqual(withTape);
    const shot = gameReducer(withTape, { type: 'PHOTO_CAPTURED', tapeId: FIRST_TAPE_ID, photoId: `${FIRST_TAPE_ID}-memory` });
    expect(shot.capturedPhotos).toEqual([`${FIRST_TAPE_ID}:${FIRST_TAPE_ID}-memory`]);
    expect(gameReducer(shot, { type: 'PHOTO_CAPTURED', tapeId: FIRST_TAPE_ID, photoId: `${FIRST_TAPE_ID}-memory` }).capturedPhotos).toHaveLength(1);
  });

  it('shifts the calendar once and only after the first tape', () => {
    const shifted = apply(createInitialState(), [...ACT_ONE.slice(0, 1), { type: 'CALENDAR_SHIFTED', date: '31-09-98' }]);
    expect(shifted.calendarDate).toBe('31-09-98');
    expect(gameReducer(createInitialState(), { type: 'CALENDAR_SHIFTED', date: '31-09-98' }).calendarDate).toBe('17-08-97');
  });

  it('chooses the secret ending only when every requirement is met, and keeps the choice final', () => {
    const archived = apply(createInitialState(), ARCHIVE_READY);
    const secretTry = gameReducer(archived, { type: 'ENDING_CHOSEN', endingId: 'archivists-truth' });
    expect(secretTry.chosenEnding).toBeNull();
    const complete = apply(archived, [{ type: 'MEMORY_RESTORED', memoryId: MEMORY_ID }, { type: 'SECRET_BOX_COLLECTED', boxId: SECRET_BOX_ID }, ...POLAROIDS]);
    const chosen = gameReducer(complete, { type: 'ENDING_CHOSEN', endingId: 'archivists-truth' });
    expect(chosen.chosenEnding).toBe('archivists-truth');
    expect(gameReducer(chosen, { type: 'ENDING_CHOSEN', endingId: 'bittersweet-dawn' }).chosenEnding).toBe('archivists-truth');
  });

  it('stamps the run start and finish once, and never finishes before it starts', () => {
    const early = gameReducer(createInitialState(), { type: 'RUN_FINISHED', at: 5 });
    expect(early.finishedAt).toBeNull();
    const started = gameReducer(createInitialState(), { type: 'RUN_STARTED', at: 1_000 });
    expect(gameReducer(started, { type: 'RUN_STARTED', at: 9_000 }).startedAt).toBe(1_000);
    expect(gameReducer(started, { type: 'RUN_FINISHED', at: 500 }).finishedAt).toBeNull();
    const finished = gameReducer(started, { type: 'RUN_FINISHED', at: 61_000 });
    expect(finished.finishedAt).toBe(61_000);
    expect(gameReducer(finished, { type: 'RUN_FINISHED', at: 90_000 }).finishedAt).toBe(61_000);
  });

  it('recovers from malformed or inconsistent save data', () => {
    expect(parseSave('{broken')).toEqual(createInitialState());
    expect(parseSave(JSON.stringify({ ...createInitialState(), endingUnlocked: true }))).toEqual(createInitialState());
    expect(parseSave(JSON.stringify({ version: 2, collectedTapes: 'tape-001' }))).toEqual(createInitialState());
  });

  it('drops a forged archive or ending that skips the story gates', () => {
    const forged = parseSave(JSON.stringify({
      version: 2,
      collectedTapes: [FIRST_TAPE_ID],
      discoveredClues: [],
      completedArcades: [SNAKE_GAME_ID],
      restoredMemories: [MEMORY_ID],
      capturedPhotos: [],
      collectedSecrets: [SECRET_BOX_ID],
      calendarDate: '31-09-98',
      introCompleted: true,
      chosenEnding: 'archivists-truth',
    }));
    expect(forged.completedArcades).toEqual([]);
    expect(forged.restoredMemories).toEqual([]);
    expect(forged.collectedSecrets).toEqual([]);
    expect(forged.chosenEnding).toBeNull();
    expect(forged.endingUnlocked).toBe(false);
  });

  it('migrates a valid v1 save to v2 without losing its progress', () => {
    const migrated = parseSave(JSON.stringify({
      version: 1,
      collectedTapes: [FIRST_TAPE_ID],
      discoveredClues: [FIRST_CLUE_ID],
      completedArcades: [SNAKE_GAME_ID],
      restoredMemories: [],
      endingUnlocked: false,
    }));
    expect(migrated.version).toBe(2);
    expect(migrated.collectedTapes).toEqual([FIRST_TAPE_ID]);
    expect(migrated.discoveredClues).toEqual([FIRST_CLUE_ID]);
    expect(migrated.completedArcades).toEqual([SNAKE_GAME_ID]);
    expect(migrated.capturedPhotos).toEqual([]);
    expect(migrated.introCompleted).toBe(false);
    expect(migrated.chosenEnding).toBeNull();
    expect(migrated.startedAt).toBeNull();
  });

  it('round-trips a finished secret run through JSON without changing it', () => {
    const complete = apply(createInitialState(), [
      { type: 'INTRO_COMPLETED' },
      { type: 'RUN_STARTED', at: 100 },
      ...ARCHIVE_READY,
      ...POLAROIDS,
      { type: 'SECRET_BOX_COLLECTED', boxId: SECRET_BOX_ID },
      { type: 'CALENDAR_SHIFTED', date: '31-09-98' },
      { type: 'MEMORY_RESTORED', memoryId: MEMORY_ID },
      { type: 'RUN_FINISHED', at: 65_100 },
      { type: 'ENDING_CHOSEN', endingId: 'archivists-truth' },
    ]);
    expect(parseSave(JSON.stringify(complete))).toEqual(complete);
  });

  it('resets to a fresh state', () => {
    expect(gameReducer(apply(createInitialState(), ACT_ONE), { type: 'RESET_DEMO' })).toEqual(createInitialState());
  });
});
