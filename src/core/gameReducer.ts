import {
  FIRST_CLUE_ID,
  FIRST_TAPE_ID,
  MEMORY_ID,
  SAVE_KEY,
  SNAKE_GAME_ID,
  type GameEvent,
  type GameState,
} from './contracts';

export const createInitialState = (): GameState => ({
  version: 1,
  collectedTapes: [],
  discoveredClues: [],
  completedArcades: [],
  restoredMemories: [],
  endingUnlocked: false,
});

function withUnique(items: string[], value: string): string[] {
  return items.includes(value) ? items : [...items, value];
}

export function gameReducer(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'TAPE_COLLECTED':
      if (event.tapeId !== FIRST_TAPE_ID) return state;
      return { ...state, collectedTapes: withUnique(state.collectedTapes, event.tapeId) };
    case 'VHS_CLUE_FOUND':
      if (event.tapeId !== FIRST_TAPE_ID || event.clueId !== FIRST_CLUE_ID || !state.collectedTapes.includes(event.tapeId)) return state;
      return { ...state, discoveredClues: withUnique(state.discoveredClues, event.clueId) };
    case 'ARCADE_STARTED':
      return state; // Session state belongs in the arcade module, not the persistent save.
    case 'ARCADE_WON':
      if (event.gameId !== SNAKE_GAME_ID || !Number.isFinite(event.score) || event.score < 0 || !state.discoveredClues.includes(FIRST_CLUE_ID)) return state;
      return { ...state, completedArcades: withUnique(state.completedArcades, event.gameId) };
    case 'MEMORY_RESTORED':
      if (event.memoryId !== MEMORY_ID || !state.completedArcades.includes(SNAKE_GAME_ID)) return state;
      return {
        ...state,
        restoredMemories: withUnique(state.restoredMemories, event.memoryId),
        endingUnlocked: true,
      };
    case 'RESET_DEMO':
      return createInitialState();
  }
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

export function parseSave(raw: string | null): GameState {
  if (!raw) return createInitialState();
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return createInitialState();
    const entry = value as Record<string, unknown>;
    if (entry.version !== 1 || !isStringList(entry.collectedTapes) || !isStringList(entry.discoveredClues) || !isStringList(entry.completedArcades) || !isStringList(entry.restoredMemories) || typeof entry.endingUnlocked !== 'boolean') {
      return createInitialState();
    }
    const tapes = [...new Set(entry.collectedTapes)].filter((id) => id === FIRST_TAPE_ID);
    const clues = tapes.includes(FIRST_TAPE_ID) ? [...new Set(entry.discoveredClues)].filter((id) => id === FIRST_CLUE_ID) : [];
    const arcades = clues.includes(FIRST_CLUE_ID) ? [...new Set(entry.completedArcades)].filter((id) => id === SNAKE_GAME_ID) : [];
    const memories = arcades.includes(SNAKE_GAME_ID) ? [...new Set(entry.restoredMemories)].filter((id) => id === MEMORY_ID) : [];
    return {
      version: 1,
      collectedTapes: tapes,
      discoveredClues: clues,
      completedArcades: arcades,
      restoredMemories: memories,
      endingUnlocked: memories.includes(MEMORY_ID),
    };
  } catch {
    return createInitialState();
  }
}

export function loadGameState(): GameState {
  try {
    return parseSave(window.localStorage.getItem(SAVE_KEY));
  } catch {
    return createInitialState();
  }
}

export function saveGameState(state: GameState): void {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be disabled. The game remains playable in memory.
  }
}
