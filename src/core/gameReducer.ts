import {
  DEAD_FREQUENCY_GAME_ID,
  FIRST_CLUE_ID,
  FIRST_TAPE_ID,
  MEMORY_ID,
  SAVE_KEY,
  SECRET_BOX_ID,
  SECOND_CLUE_ID,
  SECOND_TAPE_ID,
  SHADOW_FIGHT_GAME_ID,
  SNAKE_GAME_ID,
  THIRD_CLUE_ID,
  THIRD_TAPE_ID,
  type GameEvent,
  type GameState,
} from './contracts';

export const CALENDAR_SHIFTED_DATE = '31-09-98';

const TAPE_IDS: readonly string[] = [FIRST_TAPE_ID, SECOND_TAPE_ID, THIRD_TAPE_ID, MEMORY_ID];
const CLUE_IDS: readonly string[] = [FIRST_CLUE_ID, SECOND_CLUE_ID, THIRD_CLUE_ID];
const ARCADE_IDS: readonly string[] = [SNAKE_GAME_ID, SHADOW_FIGHT_GAME_ID, DEAD_FREQUENCY_GAME_ID];

export const createInitialState = (): GameState => ({
  version: 2,
  collectedTapes: [],
  discoveredClues: [],
  completedArcades: [],
  restoredMemories: [],
  capturedPhotos: [],
  collectedSecrets: [],
  calendarDate: '17-08-97',
  introCompleted: false,
  endingUnlocked: false,
  chosenEnding: null,
});

function withUnique(items: string[], value: string): string[] {
  return items.includes(value) ? items : [...items, value];
}
function has(state: GameState, list: keyof Pick<GameState, 'collectedTapes' | 'discoveredClues' | 'completedArcades'>, value: string): boolean {
  return state[list].includes(value);
}
function allowedTape(id: string): boolean {
  return TAPE_IDS.includes(id);
}

export function gameReducer(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'INTRO_COMPLETED':
      return { ...state, introCompleted: true };
    case 'TAPE_COLLECTED':
      if (!allowedTape(event.tapeId)) return state;
      if (event.tapeId === SECOND_TAPE_ID && !has(state, 'discoveredClues', FIRST_CLUE_ID)) return state;
      if (event.tapeId === THIRD_TAPE_ID && !has(state, 'discoveredClues', SECOND_CLUE_ID)) return state;
      if (event.tapeId === MEMORY_ID && !has(state, 'completedArcades', SNAKE_GAME_ID)) return state;
      return { ...state, collectedTapes: withUnique(state.collectedTapes, event.tapeId) };
    case 'VHS_CLUE_FOUND': {
      const valid = event.tapeId === FIRST_TAPE_ID && event.clueId === FIRST_CLUE_ID
        || event.tapeId === SECOND_TAPE_ID && event.clueId === SECOND_CLUE_ID && has(state, 'collectedTapes', SECOND_TAPE_ID)
        || event.tapeId === THIRD_TAPE_ID && event.clueId === THIRD_CLUE_ID && has(state, 'collectedTapes', THIRD_TAPE_ID);
      if (!valid || !has(state, 'collectedTapes', event.tapeId)) return state;
      return { ...state, discoveredClues: withUnique(state.discoveredClues, event.clueId) };
    }
    case 'ARCADE_STARTED':
      return state;
    case 'ARCADE_WON': {
      const validGame = ARCADE_IDS.includes(event.gameId);
      const prerequisites = event.gameId === SNAKE_GAME_ID ? has(state, 'discoveredClues', FIRST_CLUE_ID)
        : event.gameId === SHADOW_FIGHT_GAME_ID ? has(state, 'discoveredClues', SECOND_CLUE_ID)
        : has(state, 'discoveredClues', THIRD_CLUE_ID);
      if (!validGame || !Number.isFinite(event.score) || event.score < 0 || !prerequisites) return state;
      return { ...state, completedArcades: withUnique(state.completedArcades, event.gameId) };
    }
    case 'MEMORY_RESTORED':
      if (event.memoryId !== MEMORY_ID || (!has(state, 'completedArcades', DEAD_FREQUENCY_GAME_ID) && !has(state, 'completedArcades', SNAKE_GAME_ID))) return state;
      return { ...state, restoredMemories: withUnique(state.restoredMemories, event.memoryId), endingUnlocked: true };
    case 'PHOTO_CAPTURED':
      if (!has(state, 'collectedTapes', event.tapeId)) return state;
      return { ...state, capturedPhotos: withUnique(state.capturedPhotos, `${event.tapeId}:${event.photoId}`) };
    case 'SECRET_BOX_COLLECTED':
      if (event.boxId !== SECRET_BOX_ID || !has(state, 'completedArcades', SNAKE_GAME_ID)) return state;
      return { ...state, collectedSecrets: withUnique(state.collectedSecrets, event.boxId) };
    case 'CALENDAR_SHIFTED':
      if (event.date !== CALENDAR_SHIFTED_DATE || !has(state, 'collectedTapes', FIRST_TAPE_ID)) return state;
      return { ...state, calendarDate: event.date };
    case 'ENDING_CHOSEN':
      if (!state.endingUnlocked) return state;
      return { ...state, chosenEnding: event.endingId };
    case 'RESET_DEMO':
      return createInitialState();
  }
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}
function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export function parseSave(raw: string | null): GameState {
  if (!raw) return createInitialState();
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return createInitialState();
    const entry = value as Record<string, unknown>;
    if (entry.version !== 1 && entry.version !== 2) return createInitialState();
    if (!isStringList(entry.collectedTapes) || !isStringList(entry.discoveredClues) || !isStringList(entry.completedArcades) || !isStringList(entry.restoredMemories)) return createInitialState();
    const tapes = [...new Set(entry.collectedTapes)].filter((id) => allowedTape(id));
    const clues = [...new Set(entry.discoveredClues)].filter((id) => CLUE_IDS.includes(id));
    const arcades = [...new Set(entry.completedArcades)].filter((id) => ARCADE_IDS.includes(id));
    const memories = arcades.length > 0 ? [...new Set(entry.restoredMemories)].filter((id) => id === MEMORY_ID) : [];
    const capturedPhotos = isStringList(entry.capturedPhotos) ? [...new Set(entry.capturedPhotos)] : [];
    const collectedSecrets = isStringList(entry.collectedSecrets) ? [...new Set(entry.collectedSecrets)].filter((id) => id === SECRET_BOX_ID) : [];
    const chosenEnding = entry.chosenEnding === 'bittersweet-dawn' || entry.chosenEnding === 'forever-1998' || entry.chosenEnding === 'archivists-truth' ? entry.chosenEnding : null;
    return {
      version: 2,
      collectedTapes: tapes,
      discoveredClues: clues,
      completedArcades: arcades,
      restoredMemories: memories,
      capturedPhotos,
      collectedSecrets,
      calendarDate: stringOr(entry.calendarDate, tapes.includes(FIRST_TAPE_ID) ? '17-08-97' : '17-08-97'),
      introCompleted: entry.version === 2 && typeof entry.introCompleted === 'boolean' ? entry.introCompleted : false,
      endingUnlocked: memories.includes(MEMORY_ID),
      chosenEnding,
    };
  } catch {
    return createInitialState();
  }
}

export function loadGameState(): GameState {
  try { return parseSave(window.localStorage.getItem(SAVE_KEY)); } catch { return createInitialState(); }
}
export function saveGameState(state: GameState): void {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* Storage may be disabled. */ }
}
