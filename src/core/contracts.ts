export const FIRST_TAPE_ID = 'tape-001' as const;
export const FIRST_CLUE_ID = 'crt-frequency' as const;
export const SNAKE_GAME_ID = 'snake-001' as const;
export const MEMORY_ID = 'archive-09' as const;
export const SAVE_KEY = 'lost-memory-club.save.v1';

export type StationId = 'vhs' | 'arcade';

export type GameEvent =
  | { type: 'TAPE_COLLECTED'; tapeId: string }
  | { type: 'VHS_CLUE_FOUND'; tapeId: string; clueId: string }
  | { type: 'ARCADE_STARTED'; gameId: string }
  | { type: 'ARCADE_WON'; gameId: string; score: number }
  | { type: 'MEMORY_RESTORED'; memoryId: string }
  | { type: 'RESET_DEMO' };

export interface GameState {
  version: 1;
  collectedTapes: string[];
  discoveredClues: string[];
  completedArcades: string[];
  restoredMemories: string[];
  endingUnlocked: boolean;
}
