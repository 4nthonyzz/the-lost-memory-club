import {
  FAST_FORWARD_SPEED,
  REWIND_SPEED,
  TRACKING_FALLOFF,
  TRACKING_MAX,
  TRACKING_MIN,
  TRANSPORT_FPS,
  type ClueDetection,
  type TapeDefinition,
  type TransportAction,
  type TransportState,
} from './types';

const FRAME_EPSILON = 1e-6;

export function createTransportState(): TransportState {
  return {
    tape: null,
    mode: 'stopped',
    position: 0,
    duration: 0,
    tracking: 50,
    signalQuality: 0,
    detections: [],
  };
}

export function clampTracking(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.round(Math.min(TRACKING_MAX, Math.max(TRACKING_MIN, value)) * 100) / 100;
}

export function computeSignalQuality(tape: TapeDefinition | null, tracking: number): number {
  if (!tape) return 0;
  const quality = 1 - Math.abs(tracking - tape.idealTracking) / TRACKING_FALLOFF;
  return Math.round(Math.min(1, Math.max(0, quality)) * 1000) / 1000;
}

export function frameAt(position: number): number {
  return Math.floor(position * TRANSPORT_FPS + FRAME_EPSILON);
}

export function hasDetection(state: TransportState, tapeId: string, clueId: string): boolean {
  return state.detections.some((entry) => entry.tapeId === tapeId && entry.clueId === clueId);
}

export function newDetections(previous: TransportState, next: TransportState): ClueDetection[] {
  return next.detections.filter((entry) => !hasDetection(previous, entry.tapeId, entry.clueId));
}

function isValidTape(tape: TapeDefinition): boolean {
  return tape.duration > 0 && Number.isFinite(tape.duration) && tape.id.length > 0;
}

function withPosition(state: TransportState, position: number): TransportState {
  return { ...state, position: Math.min(state.duration, Math.max(0, position)) };
}

function withTracking(state: TransportState, tracking: number): TransportState {
  const next = clampTracking(tracking);
  return { ...state, tracking: next, signalQuality: computeSignalQuality(state.tape, next) };
}

function detectClues(state: TransportState): TransportState {
  const { tape } = state;
  if (!tape || state.mode !== 'paused') return state;
  const frame = frameAt(state.position);
  const found = tape.clueWindows
    .filter(
      (window) =>
        frame >= window.startFrame &&
        frame <= window.endFrame &&
        state.tracking >= window.trackingMin &&
        state.tracking <= window.trackingMax &&
        !hasDetection(state, tape.id, window.clueId),
    )
    .map((window): ClueDetection => ({ tapeId: tape.id, clueId: window.clueId }));
  return found.length === 0 ? state : { ...state, detections: [...state.detections, ...found] };
}

function tick(state: TransportState, seconds: number): TransportState {
  if (!Number.isFinite(seconds) || seconds <= 0) return state;
  switch (state.mode) {
    case 'playing': {
      const position = state.position + seconds;
      return position >= state.duration ? { ...withPosition(state, state.duration), mode: 'stopped' } : withPosition(state, position);
    }
    case 'ffwd': {
      const position = state.position + seconds * FAST_FORWARD_SPEED;
      return position >= state.duration ? { ...withPosition(state, state.duration), mode: 'stopped' } : withPosition(state, position);
    }
    case 'rewind': {
      const position = state.position - seconds * REWIND_SPEED;
      return position <= 0 ? { ...withPosition(state, 0), mode: 'stopped' } : withPosition(state, position);
    }
    default:
      return state;
  }
}

function stepFrame(state: TransportState, direction: 1 | -1): TransportState {
  if (state.mode !== 'paused') return state;
  const lastFrame = frameAt(state.duration);
  const frame = Math.min(lastFrame, Math.max(0, frameAt(state.position) + direction));
  return detectClues(withPosition(state, frame / TRANSPORT_FPS));
}

export function transportReducer(state: TransportState, action: TransportAction): TransportState {
  if (action.type === 'LOAD_TAPE') {
    if (!isValidTape(action.tape)) return state;
    const tracking = clampTracking(action.tape.initialTracking);
    return {
      ...state,
      tape: action.tape,
      mode: 'stopped',
      position: 0,
      duration: action.tape.duration,
      tracking,
      signalQuality: computeSignalQuality(action.tape, tracking),
    };
  }
  if (action.type === 'EJECT') {
    return { ...createTransportState(), detections: state.detections };
  }
  if (!state.tape) return state;

  switch (action.type) {
    case 'PLAY':
      return { ...state, mode: 'playing', position: state.position >= state.duration ? 0 : state.position };
    case 'PAUSE':
      if (state.mode === 'stopped' || state.mode === 'paused') return state;
      return detectClues({ ...state, mode: 'paused' });
    case 'STOP':
      return { ...state, mode: 'stopped' };
    case 'REWIND':
      return state.position <= 0 ? { ...state, mode: 'stopped' } : { ...state, mode: 'rewind' };
    case 'FAST_FORWARD':
      return state.position >= state.duration ? { ...state, mode: 'stopped' } : { ...state, mode: 'ffwd' };
    case 'TICK':
      return tick(state, action.seconds);
    case 'STEP_FRAME':
      return stepFrame(state, action.direction);
    case 'ADJUST_TRACKING':
      return detectClues(withTracking(state, state.tracking + action.delta));
    case 'SET_TRACKING':
      return detectClues(withTracking(state, action.value));
  }
}
