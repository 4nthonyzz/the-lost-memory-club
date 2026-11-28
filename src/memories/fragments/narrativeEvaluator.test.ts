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
} from '../../core/contracts';
import { createInitialState, gameReducer } from '../../core/gameReducer';
import { ACTS, ENDINGS } from './memoryCatalog';
import { evaluateNarrativeState, narrativeFor, type ExtraProgress } from './narrativeEvaluator';

function play(events: GameEvent[]): GameState {
  return events.reduce(gameReducer, createInitialState());
}

const collect: GameEvent = { type: 'TAPE_COLLECTED', tapeId: FIRST_TAPE_ID };
const clue: GameEvent = { type: 'VHS_CLUE_FOUND', tapeId: FIRST_TAPE_ID, clueId: FIRST_CLUE_ID };
const win: GameEvent = { type: 'ARCADE_WON', gameId: SNAKE_GAME_ID, score: 10 };
const restore: GameEvent = { type: 'MEMORY_RESTORED', memoryId: MEMORY_ID };

/** Acts two and three, so that Archive 09 can be restored. */
const laterActs: GameEvent[] = [
  { type: 'TAPE_COLLECTED', tapeId: SECOND_TAPE_ID },
  { type: 'VHS_CLUE_FOUND', tapeId: SECOND_TAPE_ID, clueId: SECOND_CLUE_ID },
  { type: 'ARCADE_WON', gameId: SHADOW_FIGHT_GAME_ID, score: 10 },
  { type: 'TAPE_COLLECTED', tapeId: THIRD_TAPE_ID },
  { type: 'VHS_CLUE_FOUND', tapeId: THIRD_TAPE_ID, clueId: THIRD_CLUE_ID },
  { type: 'ARCADE_WON', gameId: DEAD_FREQUENCY_GAME_ID, score: 10 },
];
const polaroids: GameEvent[] = [FIRST_TAPE_ID, SECOND_TAPE_ID, THIRD_TAPE_ID].map((tapeId) => ({
  type: 'PHOTO_CAPTURED' as const,
  tapeId,
  photoId: `${tapeId}-memory`,
}));
const box: GameEvent = { type: 'SECRET_BOX_COLLECTED', boxId: SECRET_BOX_ID };
const archiveOpen: GameEvent[] = [collect, clue, win, ...laterActs, restore];
const completeStory: GameEvent[] = [collect, clue, win, ...laterActs, restore, box, ...polaroids];

const allSecrets = ACTS.map((act) => act.secret.id);
const fullProgress: ExtraProgress = {
  collectedTapes: ACTS.map((act) => act.tape.id),
  discoveredClues: ACTS.map((act) => act.clueId),
  completedGames: ACTS.map((act) => act.gameId),
  minigameSecrets: allSecrets,
  perfectTrackingArchive: true,
};

describe('evaluateNarrativeState with GameState v1', () => {
  it('starts with only the first act available', () => {
    const result = evaluateNarrativeState(createInitialState());
    expect(result.acts.map((entry) => entry.status)).toEqual(['available', 'locked', 'locked']);
    expect(result.fragments).toEqual([]);
    expect(result.unlockedEndings).toEqual([]);
    expect(result.nextObjective).toContain('Summer \u201997');
  });

  it('follows the act 1 chain from tape to completed', () => {
    const statusAfter = (events: GameEvent[]) => evaluateNarrativeState(play(events)).acts[0]!.status;
    expect(statusAfter([collect])).toBe('tape-collected');
    expect(statusAfter([collect, clue])).toBe('clue-found');
    expect(statusAfter([collect, clue, win])).toBe('completed');
  });

  it('unlocks the journal fragments as progress is recorded', () => {
    const ids = (events: GameEvent[]) => evaluateNarrativeState(play(events)).fragments.map((entry) => entry.id);
    expect(ids([collect])).toEqual(['tape-001:memory']);
    expect(ids([collect, clue])).toEqual(['tape-001:memory', 'tape-001:clue']);
    expect(ids(archiveOpen)).toEqual([
    'tape-001:memory',
    'tape-001:clue',
    'tape-002:memory',
    'tape-002:clue',
    'tape-003:memory',
    'tape-003:clue',
    'archive-09:memory',
  ]);
  });

  it('opens act 2 only after act 1 is completed', () => {
    expect(evaluateNarrativeState(play([collect, clue])).acts[1]!.status).toBe('locked');
    const completed = evaluateNarrativeState(play([collect, clue, win]));
    expect(completed.acts.map((entry) => entry.status)).toEqual(['completed', 'available', 'locked']);
    expect(completed.nextObjective).toContain('Oct 30');
  });

  it('points to the arcade after the clue is found', () => {
    expect(evaluateNarrativeState(play([collect, clue])).nextObjective).toContain('SNAKE.EXE');
  });

  it('unlocks the two standard endings when archive-09 is restored', () => {
    const result = evaluateNarrativeState(play(archiveOpen));
    expect(result.archiveRestored).toBe(true);
    expect(result.unlockedEndings).toEqual(['bittersweet-dawn', 'forever-1998']);
  });

  it('does not unlock the secret ending from v1 progress alone', () => {
    const result = evaluateNarrativeState(play(archiveOpen));
    expect(result.unlockedEndings).not.toContain('archivists-truth');
    expect(result.secrets).toEqual({ found: 0, total: 3, perfectTracking: false, eligible: false });
  });

  it('does not mutate its inputs', () => {
    const state = play([collect, clue]);
    const extra: ExtraProgress = { minigameSecrets: [...allSecrets] };
    const stateSnapshot = structuredClone(state);
    const extraSnapshot = structuredClone(extra);
    evaluateNarrativeState(state, extra);
    expect(state).toEqual(stateSnapshot);
    expect(extra).toEqual(extraSnapshot);
  });

  it('is deterministic', () => {
    const state = play([collect, clue, win]);
    expect(evaluateNarrativeState(state, fullProgress)).toEqual(evaluateNarrativeState(state, fullProgress));
  });
});

describe('evaluateNarrativeState with extra progress', () => {
  it('completes acts 2 and 3 from the extra progress', () => {
    const result = evaluateNarrativeState(play([collect, clue, win]), fullProgress);
    expect(result.acts.map((entry) => entry.status)).toEqual(['completed', 'completed', 'completed']);
    expect(result.nextObjective).toBe('Restore Archive 09 at the CRT.');
  });

  it('keeps later acts locked when the previous act is incomplete', () => {
    const result = evaluateNarrativeState(createInitialState(), { collectedTapes: ['tape-003'], discoveredClues: ['dead-channel'] });
    expect(result.acts.map((entry) => entry.status)).toEqual(['available', 'locked', 'locked']);
  });

  it('unlocks the secret ending only with the full story, the box and three Polaroids', () => {
    expect(evaluateNarrativeState(play(completeStory), fullProgress).unlockedEndings).toEqual(['bittersweet-dawn', 'forever-1998', 'archivists-truth']);

    const withoutBox = play(completeStory.filter((event) => event.type !== 'SECRET_BOX_COLLECTED'));
    expect(evaluateNarrativeState(withoutBox, fullProgress).unlockedEndings).not.toContain('archivists-truth');

    const twoPolaroids = play(completeStory.filter((event) => event.type !== 'PHOTO_CAPTURED' || event.tapeId !== THIRD_TAPE_ID));
    expect(evaluateNarrativeState(twoPolaroids, fullProgress).unlockedEndings).not.toContain('archivists-truth');
  });

  it('ignores session flags for the secret ending, which follows the story gates only', () => {
    const withoutFlags = evaluateNarrativeState(play(completeStory), {});
    expect(withoutFlags.unlockedEndings).toContain('archivists-truth');
  });

  it('does not unlock the secret ending before archive-09 is restored', () => {
    const result = evaluateNarrativeState(play([collect, clue, win]), fullProgress);
    expect(result.unlockedEndings).toEqual([]);
    expect(result.secrets.eligible).toBe(false);
  });

  it('reveals the Archivist fragment only for the secret ending', () => {
    const secret = evaluateNarrativeState(play(completeStory), fullProgress);
    expect(secret.fragments.map((entry) => entry.id)).toContain('archive-09:truth');
    expect(secret.fragments.find((entry) => entry.id === 'archive-09:truth')?.text).toContain('Leo is The Archivist');
    expect(evaluateNarrativeState(play([...completeStory.slice(0, 3), ...laterActs, restore])).fragments.map((entry) => entry.id)).not.toContain('archive-09:truth');
  });

  it('ignores unknown secret identifiers', () => {
    const result = evaluateNarrativeState(createInitialState(), { minigameSecrets: ['nope', 'secret-snake-093198', 'secret-snake-093198'] });
    expect(result.secrets.found).toBe(1);
  });

  it('counts every journal fragment when all progress is present', () => {
    const result = evaluateNarrativeState(play(completeStory), fullProgress);
    expect(result.fragments).toHaveLength(result.totalFragments);
  });
});

describe('story catalog', () => {
  it('defines three acts with distinct tapes, clues and games', () => {
    expect(new Set(ACTS.map((act) => act.tape.id)).size).toBe(3);
    expect(new Set(ACTS.map((act) => act.clueId)).size).toBe(3);
    expect(new Set(ACTS.map((act) => act.gameId)).size).toBe(3);
    expect(ACTS.map((act) => act.gameName)).toEqual(['SNAKE.EXE', 'SHADOW FIGHT', 'DEAD FREQUENCY']);
  });

  it('defines the three endings', () => {
    expect(ENDINGS.map((ending) => ending.id)).toEqual(['bittersweet-dawn', 'forever-1998', 'archivists-truth']);
    expect(ENDINGS.map((ending) => ending.choiceLabel).slice(0, 2)).toEqual(['Release Memories', 'Stay in the Tape']);
  });
});

describe('narrativeFor', () => {
  it('progresses through the club stages with GameState v1', () => {
    const stage = (events: GameEvent[]) => narrativeFor(play(events)).stage;
    expect(stage([])).toBe('dormant');
    expect(stage([collect])).toBe('stirring');
    expect(stage([collect, clue])).toBe('watching');
    expect(stage([collect, clue, win])).toBe('shifted');
    expect(stage(archiveOpen)).toBe('archive-open');
  });

  it('never decreases distortion as progress grows and stays within 0..1', () => {
    const chain: GameEvent[][] = [[], [collect], [collect, clue], [collect, clue, win], archiveOpen];
    const values = chain.map((events) => narrativeFor(play(events)).distortion);
    expect(values[0]).toBe(0);
    for (let index = 1; index < values.length; index += 1) {
      expect(values[index]!).toBeGreaterThan(values[index - 1]!);
    }
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('returns English copy and the next objective', () => {
    const atmosphere = narrativeFor(play([collect]));
    expect(atmosphere.headline.length).toBeGreaterThan(0);
    expect(atmosphere.whispers.length).toBeGreaterThan(0);
    expect(atmosphere.nextObjective).toContain('Summer \u201997');
  });
});
