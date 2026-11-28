import { describe, expect, it } from 'vitest';
import {
  DEAD_FREQUENCY_GAME_ID,
  FIRST_TAPE_ID,
  MEMORY_ID,
  SECOND_TAPE_ID,
  SECRET_BOX_ID,
  SHADOW_FIGHT_GAME_ID,
  SNAKE_GAME_ID,
  THIRD_TAPE_ID,
  type GameState,
} from './contracts';
import { createInitialState } from './gameReducer';
import {
  ACT_LINKS,
  SECRET_POLAROIDS_REQUIRED,
  canChooseEnding,
  canCollectSecretBox,
  canCollectTape,
  canRestoreArchive,
  canUnlockArcade,
  isSecretEndingEligible,
  memberTitleKey,
  runSeconds,
  secretRequirementsMissing,
  unlockedEndingIds,
} from './progression';

/** A state where every gate is open except the ones a test changes. */
function fullStory(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialState(),
    collectedTapes: [FIRST_TAPE_ID, SECOND_TAPE_ID, THIRD_TAPE_ID],
    discoveredClues: ACT_LINKS.map((link) => link.clueId),
    completedArcades: ACT_LINKS.map((link) => link.gameId),
    restoredMemories: [MEMORY_ID],
    capturedPhotos: [`${FIRST_TAPE_ID}:${FIRST_TAPE_ID}-memory`, `${SECOND_TAPE_ID}:${SECOND_TAPE_ID}-memory`, `${THIRD_TAPE_ID}:${THIRD_TAPE_ID}-memory`],
    collectedSecrets: [SECRET_BOX_ID],
    endingUnlocked: true,
    ...overrides,
  };
}

describe('story gates', () => {
  it('describes three ordered acts, each tape, clue and cabinet', () => {
    expect(ACT_LINKS.map((link) => link.act)).toEqual([1, 2, 3]);
    expect(ACT_LINKS[0]!.gameId).toBe(SNAKE_GAME_ID);
    expect(ACT_LINKS[2]!.gameId).toBe(DEAD_FREQUENCY_GAME_ID);
  });

  it('offers the first tape at the start and the next tape only after the previous clue', () => {
    const fresh = createInitialState();
    expect(canCollectTape(fresh, FIRST_TAPE_ID)).toBe(true);
    expect(canCollectTape(fresh, SECOND_TAPE_ID)).toBe(false);
    const afterClueOne = { ...fresh, collectedTapes: [FIRST_TAPE_ID], discoveredClues: ['crt-frequency'] };
    expect(canCollectTape(afterClueOne, SECOND_TAPE_ID)).toBe(true);
    expect(canCollectTape(afterClueOne, FIRST_TAPE_ID)).toBe(false);
  });

  it('unlocks each cabinet only with its own clue', () => {
    const clueOne = { ...createInitialState(), discoveredClues: ['crt-frequency'] };
    expect(canUnlockArcade(clueOne, SNAKE_GAME_ID)).toBe(true);
    expect(canUnlockArcade(clueOne, DEAD_FREQUENCY_GAME_ID)).toBe(false);
  });

  it('restores Archive 09 only after every clue and every cabinet', () => {
    expect(canRestoreArchive(fullStory({ completedArcades: [SNAKE_GAME_ID] }))).toBe(false);
    expect(canRestoreArchive(fullStory({ discoveredClues: ['crt-frequency'] }))).toBe(false);
    expect(canRestoreArchive(fullStory())).toBe(true);
  });

  it('opens the secret box only after the three cabinets', () => {
    expect(canCollectSecretBox({ ...createInitialState(), completedArcades: [SNAKE_GAME_ID] })).toBe(false);
    expect(canCollectSecretBox(fullStory({ collectedSecrets: [] }))).toBe(true);
    expect(canCollectSecretBox(fullStory())).toBe(false);
  });
});

describe('secret ending requirements', () => {
  it('lists every missing requirement in story order for a fresh run', () => {
    const missing = secretRequirementsMissing(createInitialState());
    expect(missing).toEqual([
      { kind: 'tape', tapeId: FIRST_TAPE_ID },
      { kind: 'tape', tapeId: SECOND_TAPE_ID },
      { kind: 'tape', tapeId: THIRD_TAPE_ID },
      { kind: 'arcade', gameId: SNAKE_GAME_ID },
      { kind: 'arcade', gameId: SHADOW_FIGHT_GAME_ID },
      { kind: 'arcade', gameId: DEAD_FREQUENCY_GAME_ID },
      { kind: 'box' },
      { kind: 'polaroids', have: 0, need: SECRET_POLAROIDS_REQUIRED },
    ]);
  });

  it('requires exactly three Polaroids, not two', () => {
    expect(isSecretEndingEligible(fullStory())).toBe(true);
    const twoPhotos = fullStory({ capturedPhotos: fullStory().capturedPhotos.slice(0, 2) });
    expect(isSecretEndingEligible(twoPhotos)).toBe(false);
    expect(secretRequirementsMissing(twoPhotos)).toEqual([{ kind: 'polaroids', have: 2, need: 3 }]);
  });

  it('needs the archive restored, not only the requirements', () => {
    expect(isSecretEndingEligible(fullStory({ restoredMemories: [] }))).toBe(false);
  });

  it('adds the secret ending to the unlocked list only when eligible', () => {
    expect(unlockedEndingIds(createInitialState())).toEqual([]);
    expect(unlockedEndingIds(fullStory({ collectedSecrets: [] }))).toEqual(['bittersweet-dawn', 'forever-1998']);
    expect(unlockedEndingIds(fullStory())).toContain('archivists-truth');
  });

  it('allows a choice only from unlocked endings, and only once', () => {
    expect(canChooseEnding(fullStory({ collectedSecrets: [] }), 'archivists-truth')).toBe(false);
    expect(canChooseEnding(fullStory(), 'forever-1998')).toBe(true);
    expect(canChooseEnding(fullStory({ chosenEnding: 'forever-1998' }), 'bittersweet-dawn')).toBe(false);
  });
});

describe('member card', () => {
  it('chooses the title from the ending and the Polaroids the player took', () => {
    expect(memberTitleKey(fullStory({ chosenEnding: 'archivists-truth' }))).toBe('relentless-archivist');
    expect(memberTitleKey(fullStory({ chosenEnding: 'forever-1998' }))).toBe('september-guardian');
    expect(memberTitleKey(fullStory({ chosenEnding: 'bittersweet-dawn', capturedPhotos: [] }))).toBe('first-friday');
    expect(memberTitleKey(fullStory({ chosenEnding: 'bittersweet-dawn' }))).toBe('eye-of-the-lens');
    expect(memberTitleKey(createInitialState())).toBeNull();
  });

  it('measures the run from its start to the chosen ending', () => {
    expect(runSeconds({ ...createInitialState(), startedAt: 1_000, finishedAt: 91_900 })).toBe(90);
    expect(runSeconds({ ...createInitialState(), startedAt: 1_000 })).toBeNull();
    expect(runSeconds({ ...createInitialState(), startedAt: null, finishedAt: 5 })).toBeNull();
  });
});
