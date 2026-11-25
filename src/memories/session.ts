import { FIRST_CLUE_ID, FIRST_TAPE_ID, MEMORY_ID, SNAKE_GAME_ID, type GameEvent, type GameState } from '../core/contracts';
import { ACTS, ARCHIVE_TAPE, PERFECT_TRACKING_CLUE_ID } from './fragments/memoryCatalog';
import type { ExtraProgress } from './fragments/narrativeEvaluator';
import type { ClueDetection, TapeDefinition } from './restoration/types';

export interface SessionProgress {
  minigameSecrets: readonly string[];
  perfectTrackingArchive: boolean;
}

export const EMPTY_SESSION: SessionProgress = { minigameSecrets: [], perfectTrackingArchive: false };

export const DEMO_ARCADE_SCORE = 1200;

export const SUMMER_TAPE: TapeDefinition = ACTS[0]!.tape;

export function isPerfectTrackingDetection(detection: ClueDetection): boolean {
  return detection.tapeId === ARCHIVE_TAPE.id && detection.clueId === PERFECT_TRACKING_CLUE_ID;
}

export function recordPerfectTracking(session: SessionProgress): SessionProgress {
  return session.perfectTrackingArchive ? session : { ...session, perfectTrackingArchive: true };
}

export function clueEventFor(detection: ClueDetection): GameEvent {
  return { type: 'VHS_CLUE_FOUND', tapeId: detection.tapeId, clueId: detection.clueId };
}

export function toggleMinigameSecret(session: SessionProgress, secretId: string): SessionProgress {
  const present = session.minigameSecrets.includes(secretId);
  return {
    ...session,
    minigameSecrets: present ? session.minigameSecrets.filter((id) => id !== secretId) : [...session.minigameSecrets, secretId],
  };
}

export function progressFor(session: SessionProgress): ExtraProgress {
  return { minigameSecrets: session.minigameSecrets, perfectTrackingArchive: session.perfectTrackingArchive };
}

export function canLoadSummerTape(state: GameState): boolean {
  return state.collectedTapes.includes(FIRST_TAPE_ID);
}

export function canOpenArchive(state: GameState): boolean {
  return state.completedArcades.includes(SNAKE_GAME_ID);
}

export function isArchiveRestored(state: GameState): boolean {
  return state.restoredMemories.includes(MEMORY_ID);
}

export function isClueFound(state: GameState): boolean {
  return state.discoveredClues.includes(FIRST_CLUE_ID);
}
