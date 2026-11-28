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
  type EndingId,
  type GameState,
} from './contracts';

/**
 * One act of the memory loop: the tape the player takes from the shelf, the clue that tape reveals,
 * and the arcade cabinet that clue unlocks. Acts are strictly ordered, so no step can be skipped.
 */
export interface ActLink {
  readonly act: 1 | 2 | 3;
  readonly tapeId: string;
  readonly clueId: string;
  readonly gameId: string;
}

export const ACT_LINKS: readonly ActLink[] = [
  { act: 1, tapeId: FIRST_TAPE_ID, clueId: FIRST_CLUE_ID, gameId: SNAKE_GAME_ID },
  { act: 2, tapeId: SECOND_TAPE_ID, clueId: SECOND_CLUE_ID, gameId: SHADOW_FIGHT_GAME_ID },
  { act: 3, tapeId: THIRD_TAPE_ID, clueId: THIRD_CLUE_ID, gameId: DEAD_FREQUENCY_GAME_ID },
];

/** Photos needed for the secret ending. Each tape offers one Polaroid while its clue window plays. */
export const SECRET_POLAROIDS_REQUIRED = 3;

export type SecretRequirement =
  | { kind: 'tape'; tapeId: string }
  | { kind: 'arcade'; gameId: string }
  | { kind: 'box' }
  | { kind: 'polaroids'; have: number; need: number };

export type MemberTitleKey = 'first-friday' | 'eye-of-the-lens' | 'september-guardian' | 'relentless-archivist';

export function allCluesFound(state: GameState): boolean {
  return ACT_LINKS.every((link) => state.discoveredClues.includes(link.clueId));
}

export function allArcadesWon(state: GameState): boolean {
  return ACT_LINKS.every((link) => state.completedArcades.includes(link.gameId));
}

/** Archive 09 opens only after all three clues are found and all three cabinets are won. */
export function canRestoreArchive(state: GameState): boolean {
  return allCluesFound(state) && allArcadesWon(state);
}

/** A tape can be taken only after the clue of the previous act. Already collected tapes cannot be taken again. */
export function canCollectTape(state: GameState, tapeId: string): boolean {
  const index = ACT_LINKS.findIndex((link) => link.tapeId === tapeId);
  if (index < 0 || state.collectedTapes.includes(tapeId)) return false;
  if (index === 0) return true;
  return state.discoveredClues.includes(ACT_LINKS[index - 1]!.clueId);
}

/** A cabinet is playable once the clue of its act is found. */
export function canUnlockArcade(state: GameState, gameId: string): boolean {
  const link = ACT_LINKS.find((entry) => entry.gameId === gameId);
  return link !== undefined && state.discoveredClues.includes(link.clueId);
}

/** The hidden box appears on the shelf once the three cabinets are beaten. */
export function canCollectSecretBox(state: GameState): boolean {
  return allArcadesWon(state) && !state.collectedSecrets.includes(SECRET_BOX_ID);
}

/** Everything still missing for Final 3, in story order. Empty means the secret ending is eligible. */
export function secretRequirementsMissing(state: GameState): SecretRequirement[] {
  const missing: SecretRequirement[] = [];
  for (const link of ACT_LINKS) {
    if (!state.collectedTapes.includes(link.tapeId)) missing.push({ kind: 'tape', tapeId: link.tapeId });
  }
  for (const link of ACT_LINKS) {
    if (!state.completedArcades.includes(link.gameId)) missing.push({ kind: 'arcade', gameId: link.gameId });
  }
  if (!state.collectedSecrets.includes(SECRET_BOX_ID)) missing.push({ kind: 'box' });
  if (state.capturedPhotos.length < SECRET_POLAROIDS_REQUIRED) {
    missing.push({ kind: 'polaroids', have: state.capturedPhotos.length, need: SECRET_POLAROIDS_REQUIRED });
  }
  return missing;
}

export function isSecretEndingEligible(state: GameState): boolean {
  return state.restoredMemories.includes(MEMORY_ID) && secretRequirementsMissing(state).length === 0;
}

export function unlockedEndingIds(state: GameState): EndingId[] {
  if (!state.restoredMemories.includes(MEMORY_ID)) return [];
  const ids: EndingId[] = ['bittersweet-dawn', 'forever-1998'];
  if (isSecretEndingEligible(state)) ids.push('archivists-truth');
  return ids;
}

/** An ending can be chosen only when it is unlocked. Once chosen, the ending is final. */
export function canChooseEnding(state: GameState, endingId: EndingId): boolean {
  return state.chosenEnding === null && unlockedEndingIds(state).includes(endingId);
}

/** Title for the member card, chosen by ending and by the player's actions. */
export function memberTitleKey(state: GameState): MemberTitleKey | null {
  switch (state.chosenEnding) {
    case 'archivists-truth':
      return 'relentless-archivist';
    case 'forever-1998':
      return 'september-guardian';
    case 'bittersweet-dawn':
      return state.capturedPhotos.length >= SECRET_POLAROIDS_REQUIRED ? 'eye-of-the-lens' : 'first-friday';
    default:
      return null;
  }
}

/** Whole seconds from the start of the run to the chosen ending. Null while either timestamp is missing. */
export function runSeconds(state: GameState): number | null {
  if (state.startedAt === null || state.finishedAt === null) return null;
  return Math.max(0, Math.floor((state.finishedAt - state.startedAt) / 1000));
}
