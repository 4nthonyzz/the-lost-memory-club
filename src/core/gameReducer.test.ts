import { describe, expect, it } from 'vitest';
import { DEAD_FREQUENCY_GAME_ID, FIRST_CLUE_ID, FIRST_TAPE_ID, MEMORY_ID, SECOND_CLUE_ID, SECOND_TAPE_ID, SECRET_BOX_ID, SHADOW_FIGHT_GAME_ID, SNAKE_GAME_ID, THIRD_CLUE_ID, THIRD_TAPE_ID } from './contracts';
import { createInitialState, gameReducer, parseSave } from './gameReducer';

describe('game foundation state contracts', () => {
  it('does not reveal a clue before collecting its tape', () => {
    const original = createInitialState();
    expect(gameReducer(original, { type: 'VHS_CLUE_FOUND', tapeId: FIRST_TAPE_ID, clueId: FIRST_CLUE_ID })).toEqual(original);
  });

  it('never duplicates collected tapes or clues', () => {
    const withTape = gameReducer(createInitialState(), { type: 'TAPE_COLLECTED', tapeId: FIRST_TAPE_ID });
    const withClue = gameReducer(withTape, { type: 'VHS_CLUE_FOUND', tapeId: FIRST_TAPE_ID, clueId: FIRST_CLUE_ID });
    expect(gameReducer(withClue, { type: 'TAPE_COLLECTED', tapeId: FIRST_TAPE_ID }).collectedTapes).toHaveLength(1);
    expect(gameReducer(withClue, { type: 'VHS_CLUE_FOUND', tapeId: FIRST_TAPE_ID, clueId: FIRST_CLUE_ID }).discoveredClues).toHaveLength(1);
  });

  it('requires an arcade victory before restoring a memory', () => {
    let state = createInitialState();
    state = gameReducer(state, { type: 'MEMORY_RESTORED', memoryId: MEMORY_ID });
    expect(state.endingUnlocked).toBe(false);
    state = gameReducer(state, { type: 'TAPE_COLLECTED', tapeId: FIRST_TAPE_ID });
    state = gameReducer(state, { type: 'VHS_CLUE_FOUND', tapeId: FIRST_TAPE_ID, clueId: FIRST_CLUE_ID });
    state = gameReducer(state, { type: 'ARCADE_WON', gameId: SNAKE_GAME_ID, score: 12 });
    state = gameReducer(state, { type: 'MEMORY_RESTORED', memoryId: MEMORY_ID });
    expect(state.endingUnlocked).toBe(true);
  });

  it('recovers from malformed or inconsistent save data', () => {
    expect(parseSave('{broken')).toEqual(createInitialState());
    expect(parseSave(JSON.stringify({ ...createInitialState(), endingUnlocked: true }))).toEqual(createInitialState());
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
    expect(migrated.chosenEnding).toBeNull();
  });

  it('supports the three tape and arcade progression without accepting skipped gates', () => {
    let state = createInitialState();
    state = gameReducer(state, { type: 'TAPE_COLLECTED', tapeId: FIRST_TAPE_ID });
    state = gameReducer(state, { type: 'VHS_CLUE_FOUND', tapeId: FIRST_TAPE_ID, clueId: FIRST_CLUE_ID });
    state = gameReducer(state, { type: 'ARCADE_WON', gameId: SNAKE_GAME_ID, score: 10 });
    state = gameReducer(state, { type: 'TAPE_COLLECTED', tapeId: SECOND_TAPE_ID });
    expect(state.collectedTapes).toContain(SECOND_TAPE_ID);
    state = gameReducer(state, { type: 'VHS_CLUE_FOUND', tapeId: SECOND_TAPE_ID, clueId: SECOND_CLUE_ID });
    state = gameReducer(state, { type: 'ARCADE_WON', gameId: SHADOW_FIGHT_GAME_ID, score: 11 });
    state = gameReducer(state, { type: 'TAPE_COLLECTED', tapeId: THIRD_TAPE_ID });
    state = gameReducer(state, { type: 'VHS_CLUE_FOUND', tapeId: THIRD_TAPE_ID, clueId: THIRD_CLUE_ID });
    state = gameReducer(state, { type: 'ARCADE_WON', gameId: DEAD_FREQUENCY_GAME_ID, score: 12 });
    state = gameReducer(state, { type: 'SECRET_BOX_COLLECTED', boxId: SECRET_BOX_ID });
    state = gameReducer(state, { type: 'MEMORY_RESTORED', memoryId: MEMORY_ID });
    expect(state.endingUnlocked).toBe(true);
    expect(state.collectedSecrets).toEqual([SECRET_BOX_ID]);
  });

  it('records photos, shifts the calendar and stores an ending choice', () => {
    let state = gameReducer(createInitialState(), { type: 'TAPE_COLLECTED', tapeId: FIRST_TAPE_ID });
    state = gameReducer(state, { type: 'PHOTO_CAPTURED', tapeId: FIRST_TAPE_ID, photoId: 'friends' });
    state = gameReducer(state, { type: 'CALENDAR_SHIFTED', date: '31-09-98' });
    expect(state.capturedPhotos).toEqual(['tape-001:friends']);
    expect(state.calendarDate).toBe('31-09-98');
    state = gameReducer({ ...state, endingUnlocked: true }, { type: 'ENDING_CHOSEN', endingId: 'bittersweet-dawn' });
    expect(state.chosenEnding).toBe('bittersweet-dawn');
  });
});
