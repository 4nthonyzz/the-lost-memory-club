export const TRANSPORT_FPS = 24;
export const REWIND_SPEED = 4;
export const FAST_FORWARD_SPEED = 3;
export const TRACKING_MIN = 0;
export const TRACKING_MAX = 100;
export const TRACKING_FALLOFF = 40;

export type TransportMode = 'stopped' | 'playing' | 'paused' | 'rewind' | 'ffwd';

export interface ClueWindow {
  clueId: string;
  startFrame: number;
  endFrame: number;
  trackingMin: number;
  trackingMax: number;
}

export interface TapeDefinition {
  id: string;
  title: string;
  duration: number;
  idealTracking: number;
  initialTracking: number;
  clueWindows: readonly ClueWindow[];
}

export interface ClueDetection {
  tapeId: string;
  clueId: string;
}

export interface TransportState {
  tape: TapeDefinition | null;
  mode: TransportMode;
  position: number;
  duration: number;
  tracking: number;
  signalQuality: number;
  detections: readonly ClueDetection[];
}

export type TransportAction =
  | { type: 'LOAD_TAPE'; tape: TapeDefinition }
  | { type: 'EJECT' }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'STOP' }
  | { type: 'REWIND' }
  | { type: 'FAST_FORWARD' }
  | { type: 'TICK'; seconds: number }
  | { type: 'STEP_FRAME'; direction: 1 | -1 }
  | { type: 'ADJUST_TRACKING'; delta: number }
  | { type: 'SET_TRACKING'; value: number }
  | { type: 'SEEK'; position: number };
