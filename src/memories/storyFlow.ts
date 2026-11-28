import { MEMORY_ID, SECRET_BOX_ID, type GameEvent, type GameState } from '../core/contracts';
import { ACT_LINKS, canCollectSecretBox, canCollectTape, canRestoreArchive } from '../core/progression';
import { ACTS, ARCHIVE_TAPE } from './fragments/memoryCatalog';
import { tapeTitle } from './fragments/narrativeText';
import type { Language } from './i18n';
import type { TapeDefinition } from './restoration/types';

export { isSecretEndingEligible, unlockedEndingIds } from '../core/progression';

/** One thing the TV shelf can offer the player. */
export type DeckOption =
  | { kind: 'pickup'; tapeId: string }
  | { kind: 'box' }
  | { kind: 'archive' }
  | { kind: 'replay'; tapeId: string };

/** Maps a world or shelf object id to the event that collects it. Null for unknown ids. */
export function collectEvent(id: string): GameEvent | null {
  if (id === SECRET_BOX_ID) return { type: 'SECRET_BOX_COLLECTED', boxId: SECRET_BOX_ID };
  if (ACT_LINKS.some((link) => link.tapeId === id)) return { type: 'TAPE_COLLECTED', tapeId: id };
  return null;
}

export function tapeById(id: string): TapeDefinition | null {
  if (id === MEMORY_ID) return ARCHIVE_TAPE;
  return ACTS.find((act) => act.tape.id === id)?.tape ?? null;
}

export function photoIdForTape(tapeId: string): string {
  return `${tapeId}:${tapeId}-memory`;
}

export function isTapePhotoCaptured(state: GameState, tapeId: string): boolean {
  return state.capturedPhotos.includes(photoIdForTape(tapeId));
}

function isWatched(state: GameState, tapeId: string): boolean {
  const link = ACT_LINKS.find((entry) => entry.tapeId === tapeId);
  return link !== undefined && state.discoveredClues.includes(link.clueId);
}

/**
 * A tape the player already holds but has not watched yet. The TV plays it at once, so a player who
 * closed the deck early can finish that tape before anything else.
 */
export function unwatchedHeldTape(state: GameState): TapeDefinition | null {
  for (const link of ACT_LINKS) {
    if (state.collectedTapes.includes(link.tapeId) && !isWatched(state, link.tapeId)) return tapeById(link.tapeId);
  }
  return null;
}

/** Everything the shelf inside the VHS deck can offer right now, in story order. */
export function deckOptions(state: GameState): DeckOption[] {
  const options: DeckOption[] = [];
  for (const link of ACT_LINKS) {
    if (canCollectTape(state, link.tapeId)) options.push({ kind: 'pickup', tapeId: link.tapeId });
  }
  if (canCollectSecretBox(state)) options.push({ kind: 'box' });
  if (canRestoreArchive(state)) options.push({ kind: 'archive' });
  for (const link of ACT_LINKS) {
    if (state.collectedTapes.includes(link.tapeId) && isWatched(state, link.tapeId)) {
      options.push({ kind: 'replay', tapeId: link.tapeId });
    }
  }
  return options;
}

/** Label for a tape on the shelf, such as "Tape 02 · Oct 30 — The Mirror Match". */
export function shelfTapeLabel(tapeId: string, language: Language): string {
  const act = ACT_LINKS.find((link) => link.tapeId === tapeId);
  const title = tapeTitle(tapeId, language);
  if (!act) return title;
  const number = String(act.act).padStart(2, '0');
  return language === 'es' ? `Cinta ${number} \u00b7 ${title}` : `Tape ${number} \u00b7 ${title}`;
}

/**
 * One short line at the top of the screen: the first step the player has not finished.
 * The order matches the acts: take the tape, find its clue, beat its cabinet, then the archive.
 */
export function objectiveLine(state: GameState, language: Language): string {
  const es = language === 'es';
  for (const link of ACT_LINKS) {
    const number = link.act;
    const game = ACTS.find((act) => act.gameId === link.gameId)?.gameName ?? link.gameId;
    if (!state.collectedTapes.includes(link.tapeId)) {
      if (link.act === 1) {
        return es
          ? '1. Abre la platina del televisor y recoge la primera cinta [E]'
          : '1. Open the VCR at the TV and take the first tape [E]';
      }
      return es
        ? `${number}. Abre la platina y recoge la cinta ${number} [E]`
        : `${number}. Open the VCR and take tape ${number} [E]`;
    }
    if (!state.discoveredClues.includes(link.clueId)) {
      return es
        ? `${number}. Reproduce la cinta ${number} y encuentra la pista`
        : `${number}. Play tape ${number} and find the clue`;
    }
    if (!state.completedArcades.includes(link.gameId)) {
      return es ? `${number}. Juega ${game} en la recreativa [E]` : `${number}. Play ${game} in the arcade [E]`;
    }
  }
  if (!state.restoredMemories.includes(MEMORY_ID)) {
    return es ? '4. Reproduce Archivo 09 en la platina [E]' : '4. Play Archive 09 in the VCR [E]';
  }
  if (!state.collectedSecrets.includes(SECRET_BOX_ID)) {
    return es
      ? '5. Busca la caja de Julian y Maya en la platina [E]'
      : '5. Look for Julian and Maya\u2019s box in the VCR [E]';
  }
  if (state.chosenEnding === null) {
    return es ? '6. Decide c\u00f3mo termina el club' : '6. Decide how the club ends';
  }
  return es ? 'Midnight Rentals duerme. Gracias por recordar.' : 'Midnight Rentals sleeps. Thank you for remembering.';
}
