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
} from '../core/contracts';
import { createInitialState, gameReducer } from '../core/gameReducer';
import { ARCHIVE_TAPE } from './fragments/memoryCatalog';
import { collectEvent, deckOptions, isSecretEndingEligible, objectiveLine, shelfTapeLabel, tapeById, unwatchedHeldTape, unlockedEndingIds } from './storyFlow';

function play(events: GameEvent[]): GameState {
  return events.reduce(gameReducer, createInitialState());
}

const actOne: GameEvent[] = [
  { type: 'TAPE_COLLECTED', tapeId: FIRST_TAPE_ID },
  { type: 'VHS_CLUE_FOUND', tapeId: FIRST_TAPE_ID, clueId: FIRST_CLUE_ID },
  { type: 'ARCADE_WON', gameId: SNAKE_GAME_ID, score: 10 },
];
const actTwo: GameEvent[] = [
  { type: 'TAPE_COLLECTED', tapeId: SECOND_TAPE_ID },
  { type: 'VHS_CLUE_FOUND', tapeId: SECOND_TAPE_ID, clueId: SECOND_CLUE_ID },
  { type: 'ARCADE_WON', gameId: SHADOW_FIGHT_GAME_ID, score: 10 },
];
const actThree: GameEvent[] = [
  { type: 'TAPE_COLLECTED', tapeId: THIRD_TAPE_ID },
  { type: 'VHS_CLUE_FOUND', tapeId: THIRD_TAPE_ID, clueId: THIRD_CLUE_ID },
  { type: 'ARCADE_WON', gameId: DEAD_FREQUENCY_GAME_ID, score: 10 },
];

describe('collecting objects', () => {
  it('maps the tapes and the box to collect events, and nothing else', () => {
    expect(collectEvent(FIRST_TAPE_ID)).toEqual({ type: 'TAPE_COLLECTED', tapeId: FIRST_TAPE_ID });
    expect(collectEvent(SECRET_BOX_ID)).toEqual({ type: 'SECRET_BOX_COLLECTED', boxId: SECRET_BOX_ID });
    expect(collectEvent(MEMORY_ID)).toBeNull();
    expect(collectEvent('desk-lamp')).toBeNull();
  });

  it('resolves tape ids, including Archive 09', () => {
    expect(tapeById(MEMORY_ID)).toBe(ARCHIVE_TAPE);
    expect(tapeById(SECOND_TAPE_ID)?.id).toBe(SECOND_TAPE_ID);
    expect(tapeById('nope')).toBeNull();
  });
});

describe('the VHS shelf', () => {
  it('offers only the first tape on a fresh run', () => {
    expect(deckOptions(createInitialState())).toEqual([{ kind: 'pickup', tapeId: FIRST_TAPE_ID }]);
  });

  it('offers the next tape and a replay after the first clue, but no archive', () => {
    const state = play([...actOne.slice(0, 2)]);
    expect(deckOptions(state)).toEqual([
      { kind: 'pickup', tapeId: SECOND_TAPE_ID },
      { kind: 'replay', tapeId: FIRST_TAPE_ID },
    ]);
  });

  it('does not offer Archive 09 after the first cabinet alone', () => {
    const options = deckOptions(play(actOne));
    expect(options.some((option) => option.kind === 'archive')).toBe(false);
  });

  it('offers the box and Archive 09 once every cabinet is beaten', () => {
    const options = deckOptions(play([...actOne, ...actTwo, ...actThree]));
    expect(options.map((option) => option.kind)).toEqual(expect.arrayContaining(['box', 'archive']));
  });

  it('plays a held tape that is not watched yet before anything else', () => {
    const held = play([{ type: 'TAPE_COLLECTED', tapeId: FIRST_TAPE_ID }]);
    expect(unwatchedHeldTape(held)?.id).toBe(FIRST_TAPE_ID);
    expect(unwatchedHeldTape(play(actOne.slice(0, 2)))).toBeNull();
  });
});

describe('objective line', () => {
  it('names the next step and never shows a raw id', () => {
    expect(objectiveLine(createInitialState(), 'en')).toContain('take the first tape');
    expect(objectiveLine(play(actOne.slice(0, 1)), 'en')).toContain('find the clue');
    expect(objectiveLine(play(actOne.slice(0, 2)), 'en')).toContain('Play SNAKE.EXE');
    expect(objectiveLine(play(actOne), 'en')).toContain('take tape 2');
    expect(objectiveLine(play([...actOne, ...actTwo, ...actThree]), 'en')).toContain('Play Archive 09');
    for (const language of ['en', 'es'] as const) {
      expect(objectiveLine(play(actOne), language)).not.toMatch(/tape-00\d|archive-09|snake-001/);
    }
  });

  it('speaks Spanish on request', () => {
    expect(objectiveLine(play(actOne), 'es')).toContain('recoge la cinta 2');
  });
});

describe('labels and endings', () => {
  it('labels shelf tapes by act number and title in each language', () => {
    expect(shelfTapeLabel(SECOND_TAPE_ID, 'en')).toMatch(/^Tape 02 \u00b7 /);
    expect(shelfTapeLabel(SECOND_TAPE_ID, 'es')).toMatch(/^Cinta 02 \u00b7 /);
  });

  it('re-exports the secret-ending rules from core', () => {
    expect(isSecretEndingEligible(play([...actOne, ...actTwo, ...actThree]))).toBe(false);
    expect(unlockedEndingIds(play([...actOne, ...actTwo, ...actThree]))).toEqual([]);
  });
});
