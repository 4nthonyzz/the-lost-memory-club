import {
  FIRST_CLUE_ID,
  FIRST_TAPE_ID,
  MEMORY_ID,
  SECOND_CLUE_ID,
  SECOND_TAPE_ID,
  SECRET_BOX_ID,
  THIRD_CLUE_ID,
  THIRD_TAPE_ID,
  type EndingId,
  type GameEvent,
  type GameState,
} from '../core/contracts';
import { gameReducer } from '../core/gameReducer';
import { ACTS, ARCHIVE_TAPE } from './fragments/memoryCatalog';
import type { Language } from './i18n';
import type { TapeDefinition } from './restoration/types';

export const COLLECTIBLE_IDS = [FIRST_TAPE_ID, SECOND_TAPE_ID, THIRD_TAPE_ID, SECRET_BOX_ID] as const;

const TAPE_CLUES: ReadonlyArray<readonly [string, string]> = [
  [FIRST_TAPE_ID, FIRST_CLUE_ID],
  [SECOND_TAPE_ID, SECOND_CLUE_ID],
  [THIRD_TAPE_ID, THIRD_CLUE_ID],
];

export function collectEvent(id: string): GameEvent | null {
  if (id === SECRET_BOX_ID) return { type: 'SECRET_BOX_COLLECTED', boxId: SECRET_BOX_ID };
  if (id === FIRST_TAPE_ID || id === SECOND_TAPE_ID || id === THIRD_TAPE_ID) return { type: 'TAPE_COLLECTED', tapeId: id };
  return null;
}

export function isCollected(state: GameState, id: string): boolean {
  return id === SECRET_BOX_ID ? state.collectedSecrets.includes(id) : state.collectedTapes.includes(id);
}

/** Objects still in the room: not yet collected, and the story already lets the player take them (the reducer accepts it). */
export function availableCollectibles(state: GameState): string[] {
  return COLLECTIBLE_IDS.filter((id) => {
    if (isCollected(state, id)) return false;
    const event = collectEvent(id);
    return event !== null && gameReducer(state, event) !== state;
  });
}

function isWatched(state: GameState, tapeId: string): boolean {
  const clue = TAPE_CLUES.find(([tape]) => tape === tapeId)?.[1];
  return clue !== undefined && state.discoveredClues.includes(clue);
}

export function tapeById(id: string): TapeDefinition | null {
  if (id === MEMORY_ID) return ARCHIVE_TAPE;
  return ACTS.find((act) => act.tape.id === id)?.tape ?? null;
}

/** The tape the VCR plays next: an unwatched tape the player holds, then Archive 09 once the arcade is beaten, else a replay. */
export function nextTape(state: GameState): TapeDefinition | null {
  for (const [tapeId] of TAPE_CLUES) {
    if (state.collectedTapes.includes(tapeId) && !isWatched(state, tapeId)) return tapeById(tapeId);
  }
  if (state.completedArcades.length > 0) return ARCHIVE_TAPE;
  const held = [...TAPE_CLUES].reverse().find(([tapeId]) => state.collectedTapes.includes(tapeId));
  return held ? tapeById(held[0]) : null;
}

/** The KV-1996 hums with static while there is something new to play. */
export function tvCalling(state: GameState): boolean {
  if (TAPE_CLUES.some(([tapeId]) => state.collectedTapes.includes(tapeId) && !isWatched(state, tapeId))) return true;
  return state.completedArcades.length > 0 && !state.restoredMemories.includes(MEMORY_ID);
}

/** Final 3: all three tapes, arcade progress, the hidden box and Archive 09 restored. */
export function secretEndingEligible(state: GameState): boolean {
  return (
    TAPE_CLUES.every(([tapeId]) => state.collectedTapes.includes(tapeId)) &&
    state.collectedSecrets.includes(SECRET_BOX_ID) &&
    state.completedArcades.length > 0 &&
    state.restoredMemories.includes(MEMORY_ID)
  );
}

export function unlockedEndingIds(state: GameState): EndingId[] {
  if (!state.restoredMemories.includes(MEMORY_ID)) return [];
  const ids: EndingId[] = ['bittersweet-dawn', 'forever-1998'];
  if (secretEndingEligible(state)) ids.push('archivists-truth');
  return ids;
}

/** One short line at the top of the screen. */
export function objectiveLine(state: GameState, language: Language): string {
  const es = language === 'es';
  if (!state.collectedTapes.includes(FIRST_TAPE_ID)) return es ? '1. Recoge la cinta VHS del mostrador [E]' : '1. Pick up the VHS tape on the desk [E]';
  if (!state.discoveredClues.includes(FIRST_CLUE_ID)) return es ? '2. Inserta la cinta en la videograbadora del televisor [E]' : '2. Insert the tape into the VCR under the TV [E]';
  if (state.completedArcades.length === 0) return es ? '3. Explora la sala Arcade iluminada o busca la siguiente cinta' : '3. Explore the lit Arcade room or find the next tape';
  if (!state.restoredMemories.includes(MEMORY_ID)) return es ? '4. Reproduce Archive 09 en el televisor KV-1996 [E]' : '4. Play Archive 09 on the KV-1996 [E]';
  if (state.chosenEnding === null) return es ? '5. Decide c\u00f3mo termina el club' : '5. Decide how the club ends';
  return es ? 'Midnight Rentals duerme. Gracias por recordar.' : 'Midnight Rentals sleeps. Thank you for remembering.';
}
