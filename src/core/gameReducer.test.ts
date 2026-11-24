import { describe, expect, it } from 'vitest';
import { FIRST_CLUE_ID, FIRST_TAPE_ID, MEMORY_ID, SNAKE_GAME_ID } from './contracts';
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
});
