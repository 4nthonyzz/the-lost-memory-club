import {
  FIRST_TAPE_ID,
  MEMORY_ID,
  SAVE_KEY,
  SECRET_BOX_ID,
  type EndingId,
  type GameEvent,
  type GameState,
} from './contracts';
import {
  ACT_LINKS,
  canChooseEnding,
  canCollectSecretBox,
  canCollectTape,
  canRestoreArchive,
  canUnlockArcade,
} from './progression';

export const CALENDAR_SHIFTED_DATE = '31-09-98';
export const CALENDAR_START_DATE = '17-08-97';

const ENDING_IDS: readonly EndingId[] = ['bittersweet-dawn', 'forever-1998', 'archivists-truth'];

export const createInitialState = (): GameState => ({
  version: 2,
  collectedTapes: [],
  discoveredClues: [],
  completedArcades: [],
  restoredMemories: [],
  capturedPhotos: [],
  collectedSecrets: [],
  calendarDate: CALENDAR_START_DATE,
  introCompleted: false,
  endingUnlocked: false,
  chosenEnding: null,
  startedAt: null,
  finishedAt: null,
});

function isTimestamp(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/** The only writer of GameState. Every rule that gates progress is enforced here, not in the UI. */
export function gameReducer(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'INTRO_COMPLETED':
      return state.introCompleted ? state : { ...state, introCompleted: true };

    case 'TAPE_COLLECTED':
      if (!canCollectTape(state, event.tapeId)) return state;
      return { ...state, collectedTapes: [...state.collectedTapes, event.tapeId] };

    case 'VHS_CLUE_FOUND': {
      const link = ACT_LINKS.find((entry) => entry.tapeId === event.tapeId && entry.clueId === event.clueId);
      if (!link || !state.collectedTapes.includes(event.tapeId) || state.discoveredClues.includes(event.clueId)) return state;
      return { ...state, discoveredClues: [...state.discoveredClues, event.clueId] };
    }

    case 'ARCADE_STARTED':
      return state;

    case 'ARCADE_WON':
      if (!Number.isFinite(event.score) || event.score < 0) return state;
      if (!canUnlockArcade(state, event.gameId) || state.completedArcades.includes(event.gameId)) return state;
      return { ...state, completedArcades: [...state.completedArcades, event.gameId] };

    case 'MEMORY_RESTORED':
      if (event.memoryId !== MEMORY_ID || state.restoredMemories.includes(MEMORY_ID)) return state;
      if (!canRestoreArchive(state)) return state;
      return { ...state, restoredMemories: [...state.restoredMemories, MEMORY_ID], endingUnlocked: true };

    case 'PHOTO_CAPTURED': {
      const photo = `${event.tapeId}:${event.photoId}`;
      if (!state.collectedTapes.includes(event.tapeId) || event.photoId !== `${event.tapeId}-memory`) return state;
      if (state.capturedPhotos.includes(photo)) return state;
      return { ...state, capturedPhotos: [...state.capturedPhotos, photo] };
    }

    case 'SECRET_BOX_COLLECTED':
      if (event.boxId !== SECRET_BOX_ID || !canCollectSecretBox(state)) return state;
      return { ...state, collectedSecrets: [...state.collectedSecrets, event.boxId] };

    case 'CALENDAR_SHIFTED':
      if (event.date !== CALENDAR_SHIFTED_DATE || state.calendarDate === event.date) return state;
      if (!state.collectedTapes.includes(FIRST_TAPE_ID)) return state;
      return { ...state, calendarDate: event.date };

    case 'RUN_STARTED':
      if (state.startedAt !== null || !isTimestamp(event.at)) return state;
      return { ...state, startedAt: event.at };

    case 'RUN_FINISHED':
      if (state.startedAt === null || state.finishedAt !== null) return state;
      if (!isTimestamp(event.at) || event.at < state.startedAt) return state;
      return { ...state, finishedAt: event.at };

    case 'ENDING_CHOSEN':
      if (!canChooseEnding(state, event.endingId)) return state;
      return { ...state, chosenEnding: event.endingId };

    case 'RESET_DEMO':
      return createInitialState();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isEndingId(value: unknown): value is EndingId {
  return typeof value === 'string' && (ENDING_IDS as readonly string[]).includes(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readSnapshot(raw: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(raw);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Rebuilds state from a saved snapshot (version 1 or 2) by replaying its facts through the reducer
 * in story order. A fact that breaks a progression rule is dropped, so a hand-edited save cannot skip a gate.
 * Malformed or unknown data falls back to a fresh state.
 */
export function parseSave(raw: string | null): GameState {
  if (!raw) return createInitialState();
  const snapshot = readSnapshot(raw);
  if (!snapshot || (snapshot.version !== 1 && snapshot.version !== 2)) return createInitialState();

  const { collectedTapes, discoveredClues, completedArcades, restoredMemories } = snapshot;
  if (!isStringList(collectedTapes) || !isStringList(discoveredClues) || !isStringList(completedArcades) || !isStringList(restoredMemories)) {
    return createInitialState();
  }
  const capturedPhotos = isStringList(snapshot.capturedPhotos) ? snapshot.capturedPhotos : [];
  const collectedSecrets = isStringList(snapshot.collectedSecrets) ? snapshot.collectedSecrets : [];
  const isVersion2 = snapshot.version === 2;

  const facts: GameEvent[] = [];
  for (const link of ACT_LINKS) {
    if (collectedTapes.includes(link.tapeId)) facts.push({ type: 'TAPE_COLLECTED', tapeId: link.tapeId });
    if (discoveredClues.includes(link.clueId)) facts.push({ type: 'VHS_CLUE_FOUND', tapeId: link.tapeId, clueId: link.clueId });
    if (completedArcades.includes(link.gameId)) facts.push({ type: 'ARCADE_WON', gameId: link.gameId, score: 0 });
  }
  for (const photo of capturedPhotos) {
    const separator = photo.indexOf(':');
    if (separator > 0) facts.push({ type: 'PHOTO_CAPTURED', tapeId: photo.slice(0, separator), photoId: photo.slice(separator + 1) });
  }
  if (collectedSecrets.includes(SECRET_BOX_ID)) facts.push({ type: 'SECRET_BOX_COLLECTED', boxId: SECRET_BOX_ID });
  if (snapshot.calendarDate === CALENDAR_SHIFTED_DATE) facts.push({ type: 'CALENDAR_SHIFTED', date: CALENDAR_SHIFTED_DATE });
  if (restoredMemories.includes(MEMORY_ID)) facts.push({ type: 'MEMORY_RESTORED', memoryId: MEMORY_ID });
  if (isVersion2 && snapshot.introCompleted === true) facts.push({ type: 'INTRO_COMPLETED' });
  if (isVersion2 && isNumber(snapshot.startedAt)) facts.push({ type: 'RUN_STARTED', at: snapshot.startedAt });
  if (isVersion2 && isNumber(snapshot.finishedAt)) facts.push({ type: 'RUN_FINISHED', at: snapshot.finishedAt });
  if (isVersion2 && isEndingId(snapshot.chosenEnding)) facts.push({ type: 'ENDING_CHOSEN', endingId: snapshot.chosenEnding });

  return facts.reduce((current, fact) => gameReducer(current, fact), createInitialState());
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
    /* Storage may be disabled. */
  }
}
