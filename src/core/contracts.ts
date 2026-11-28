export const FIRST_TAPE_ID = 'tape-001' as const;
export const SECOND_TAPE_ID = 'tape-002' as const;
export const THIRD_TAPE_ID = 'tape-003' as const;
export const FIRST_CLUE_ID = 'crt-frequency' as const;
export const SECOND_CLUE_ID = 'mirror-stance' as const;
export const THIRD_CLUE_ID = 'dead-channel' as const;
export const SECRET_BOX_ID = 'julian-maya-box' as const;
export const SNAKE_GAME_ID = 'snake-001' as const;
export const SHADOW_FIGHT_GAME_ID = 'shadow-fight-001' as const;
export const DEAD_FREQUENCY_GAME_ID = 'dead-frequency-001' as const;
export const MEMORY_ID = 'archive-09' as const;
export const SAVE_KEY = 'lost-memory-club.save.v1';

export type StationId = 'vhs' | 'arcade';
export type EndingId = 'bittersweet-dawn' | 'forever-1998' | 'archivists-truth';

/**
 * Events are the only way to change persistent state. Payloads of the original events are unchanged.
 * RUN_STARTED and RUN_FINISHED carry a timestamp supplied by the UI, so the reducer stays pure.
 */
export type GameEvent =
  | { type: 'TAPE_COLLECTED'; tapeId: string }
  | { type: 'VHS_CLUE_FOUND'; tapeId: string; clueId: string }
  | { type: 'ARCADE_STARTED'; gameId: string }
  | { type: 'ARCADE_WON'; gameId: string; score: number }
  | { type: 'MEMORY_RESTORED'; memoryId: string }
  | { type: 'PHOTO_CAPTURED'; tapeId: string; photoId: string }
  | { type: 'SECRET_BOX_COLLECTED'; boxId: string }
  | { type: 'INTRO_COMPLETED' }
  | { type: 'CALENDAR_SHIFTED'; date: string }
  | { type: 'ENDING_CHOSEN'; endingId: EndingId }
  | { type: 'RUN_STARTED'; at: number }
  | { type: 'RUN_FINISHED'; at: number }
  | { type: 'RESET_DEMO' };

export interface GameState {
  version: 2;
  collectedTapes: string[];
  discoveredClues: string[];
  completedArcades: string[];
  restoredMemories: string[];
  capturedPhotos: string[];
  collectedSecrets: string[];
  calendarDate: string;
  introCompleted: boolean;
  endingUnlocked: boolean;
  chosenEnding: EndingId | null;
  /** Epoch milliseconds when the run left the PLAY screen. Null before the run starts. */
  startedAt: number | null;
  /** Epoch milliseconds when the player chose an ending. Null until then. */
  finishedAt: number | null;
}
