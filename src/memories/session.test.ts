import { describe, expect, it } from 'vitest';
import { FIRST_CLUE_ID, FIRST_TAPE_ID, MEMORY_ID, SNAKE_GAME_ID, type GameEvent, type GameState } from '../core/contracts';
import { createInitialState, gameReducer } from '../core/gameReducer';
import { buildJournalModel } from './fragments/journalView';
import { ACTS, ARCHIVE_TAPE, PERFECT_TRACKING_CLUE_ID } from './fragments/memoryCatalog';
import {
  canLoadSummerTape,
  canOpenArchive,
  clueEventFor,
  DEMO_ARCADE_SCORE,
  EMPTY_SESSION,
  isArchiveRestored,
  isClueFound,
  isPerfectTrackingDetection,
  progressFor,
  recordPerfectTracking,
  SUMMER_TAPE,
  toggleMinigameSecret,
} from './session';
import { createTransportState, transportReducer } from './restoration/transportReducer';
import { TRANSPORT_FPS, type ClueDetection, type TransportAction } from './restoration/types';

function apply(state: GameState, events: GameEvent[]): GameState {
  return events.reduce(gameReducer, state);
}

function detectionsFrom(actions: TransportAction[]): ClueDetection[] {
  return actions.reduce(transportReducer, createTransportState()).detections.slice();
}

describe('detection routing', () => {
  it('marks only the archive perfect-tracking detection as a session flag', () => {
    const perfect: ClueDetection = { tapeId: ARCHIVE_TAPE.id, clueId: PERFECT_TRACKING_CLUE_ID };
    expect(isPerfectTrackingDetection(perfect)).toBe(true);
    expect(isPerfectTrackingDetection({ tapeId: SUMMER_TAPE.id, clueId: FIRST_CLUE_ID })).toBe(false);
    expect(isPerfectTrackingDetection({ tapeId: MEMORY_ID, clueId: FIRST_CLUE_ID })).toBe(false);
  });

  it('turns a clue detection into a VHS_CLUE_FOUND event with the same ids', () => {
    expect(clueEventFor({ tapeId: FIRST_TAPE_ID, clueId: FIRST_CLUE_ID })).toEqual({
      type: 'VHS_CLUE_FOUND',
      tapeId: FIRST_TAPE_ID,
      clueId: FIRST_CLUE_ID,
    });
  });

  it('records perfect tracking once and keeps the same object afterwards', () => {
    const recorded = recordPerfectTracking(EMPTY_SESSION);
    expect(recorded.perfectTrackingArchive).toBe(true);
    expect(recordPerfectTracking(recorded)).toBe(recorded);
  });
});

describe('session secrets', () => {
  it('toggles a minigame secret on and off without duplicates', () => {
    const on = toggleMinigameSecret(EMPTY_SESSION, 'secret-snake-093198');
    expect(on.minigameSecrets).toEqual(['secret-snake-093198']);
    const twice = toggleMinigameSecret(on, 'secret-snake-093198');
    expect(twice.minigameSecrets).toEqual([]);
  });

  it('exposes the session as extra progress for the narrative evaluator', () => {
    const session = toggleMinigameSecret(recordPerfectTracking(EMPTY_SESSION), ACTS[1]!.secret.id);
    expect(progressFor(session)).toEqual({ minigameSecrets: [ACTS[1]!.secret.id], perfectTrackingArchive: true });
  });
});

describe('gates used by the App shell', () => {
  it('opens the summer tape only after it is collected', () => {
    const initial = createInitialState();
    expect(canLoadSummerTape(initial)).toBe(false);
    expect(canLoadSummerTape(apply(initial, [{ type: 'TAPE_COLLECTED', tapeId: FIRST_TAPE_ID }]))).toBe(true);
  });

  it('opens Archive 09 only after the arcade is won', () => {
    const withClue = apply(createInitialState(), [
      { type: 'TAPE_COLLECTED', tapeId: FIRST_TAPE_ID },
      { type: 'VHS_CLUE_FOUND', tapeId: FIRST_TAPE_ID, clueId: FIRST_CLUE_ID },
    ]);
    expect(canOpenArchive(withClue)).toBe(false);
    expect(canOpenArchive(apply(withClue, [{ type: 'ARCADE_WON', gameId: SNAKE_GAME_ID, score: DEMO_ARCADE_SCORE }]))).toBe(true);
  });

  it('reports the clue and archive flags from GameState v1', () => {
    expect(isClueFound(createInitialState())).toBe(false);
    expect(isArchiveRestored(createInitialState())).toBe(false);
  });
});

describe('end-to-end demo path through the reducer and the player', () => {
  it('goes from tape to clue, arcade win, archive restore and the secret ending', () => {
    const clue = SUMMER_TAPE.clueWindows[0]!;

    let state = apply(createInitialState(), [{ type: 'TAPE_COLLECTED', tapeId: SUMMER_TAPE.id }]);
    const clueDetections = detectionsFrom([
      { type: 'LOAD_TAPE', tape: SUMMER_TAPE },
      { type: 'SET_TRACKING', value: SUMMER_TAPE.idealTracking },
      { type: 'PLAY' },
      { type: 'TICK', seconds: clue.startFrame / TRANSPORT_FPS },
      { type: 'PAUSE' },
    ]);
    expect(clueDetections).toHaveLength(1);
    state = apply(state, clueDetections.map(clueEventFor));
    expect(isClueFound(state)).toBe(true);

    state = apply(state, [{ type: 'ARCADE_WON', gameId: SNAKE_GAME_ID, score: DEMO_ARCADE_SCORE }]);
    expect(canOpenArchive(state)).toBe(true);

    state = apply(state, [{ type: 'MEMORY_RESTORED', memoryId: MEMORY_ID }]);
    expect(isArchiveRestored(state)).toBe(true);
    expect(state.endingUnlocked).toBe(true);

    const perfectDetections = detectionsFrom([
      { type: 'LOAD_TAPE', tape: ARCHIVE_TAPE },
      { type: 'PLAY' },
      { type: 'TICK', seconds: ARCHIVE_TAPE.clueWindows[0]!.startFrame / TRANSPORT_FPS },
      { type: 'PAUSE' },
      { type: 'SET_TRACKING', value: 100 },
    ]);
    expect(perfectDetections.some(isPerfectTrackingDetection)).toBe(true);

    let session = recordPerfectTracking(EMPTY_SESSION);
    for (const act of ACTS) session = toggleMinigameSecret(session, act.secret.id);

    const journal = buildJournalModel(state, progressFor(session), 'en');
    expect(journal.endings.map((ending) => ending.id)).toEqual(['bittersweet-dawn', 'forever-1998', 'archivists-truth']);
  });

  it('keeps the ending locked when the secret flags are missing', () => {
    const state = apply(createInitialState(), [
      { type: 'TAPE_COLLECTED', tapeId: FIRST_TAPE_ID },
      { type: 'VHS_CLUE_FOUND', tapeId: FIRST_TAPE_ID, clueId: FIRST_CLUE_ID },
      { type: 'ARCADE_WON', gameId: SNAKE_GAME_ID, score: DEMO_ARCADE_SCORE },
      { type: 'MEMORY_RESTORED', memoryId: MEMORY_ID },
    ]);
    const journal = buildJournalModel(state, progressFor(EMPTY_SESSION), 'es');
    expect(journal.endings.map((ending) => ending.id)).toEqual(['bittersweet-dawn', 'forever-1998']);
  });

  it('does not treat a perfect signal on a different tape as the archive flag', () => {
    const wrongTape = detectionsFrom([
      { type: 'LOAD_TAPE', tape: SUMMER_TAPE },
      { type: 'SET_TRACKING', value: SUMMER_TAPE.idealTracking },
      { type: 'PLAY' },
      { type: 'TICK', seconds: 1 },
      { type: 'PAUSE' },
    ]);
    expect(wrongTape.some(isPerfectTrackingDetection)).toBe(false);
  });
});
