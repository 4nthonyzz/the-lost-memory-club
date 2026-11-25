import { frameAt } from './restoration/transportReducer';
import { TRANSPORT_FPS, type TapeDefinition, type TransportState } from './restoration/types';

export type Atmosphere = 'cold' | 'amber';

export const AMBER_THRESHOLD = 0.8;

export interface VisualParams {
  atmosphere: Atmosphere;
  noise: number;
  jitter: number;
  chromatic: number;
  bandShift: number;
  flicker: number;
  reveal: number;
}

const FRAME_REACH = TRANSPORT_FPS * 2;
const TRACKING_REACH = 25;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function atmosphereFor(signalQuality: number): Atmosphere {
  return signalQuality >= AMBER_THRESHOLD ? 'amber' : 'cold';
}

export function clueReveal(tape: TapeDefinition | null, position: number, tracking: number): number {
  if (!tape) return 0;
  const frame = frameAt(position);
  let best = 0;
  for (const window of tape.clueWindows) {
    const frameDistance = Math.max(window.startFrame - frame, frame - window.endFrame, 0);
    const trackingDistance = Math.max(window.trackingMin - tracking, tracking - window.trackingMax, 0);
    const amount = clamp01(1 - frameDistance / FRAME_REACH) * clamp01(1 - trackingDistance / TRACKING_REACH);
    best = Math.max(best, amount);
  }
  return Math.round(best * 100) / 100;
}

export function computeVisualParams(state: TransportState, reducedDistortion: boolean): VisualParams {
  const quality = state.signalQuality;
  const moving = state.mode === 'rewind' || state.mode === 'ffwd';
  const reveal = clueReveal(state.tape, state.position, state.tracking);
  const rawNoise = state.mode === 'stopped' ? 0.5 : 0.08 + (1 - quality) * 0.7 + (moving ? 0.15 : 0);
  const rawJitter = quality < 0.5 ? (0.5 - quality) * 12 : 0;
  const rawChromatic = Math.min(6, (1 - quality) * 4 + reveal * 3);
  return {
    atmosphere: atmosphereFor(quality),
    noise: Math.min(1, reducedDistortion ? rawNoise * 0.5 : rawNoise),
    jitter: reducedDistortion ? 0 : rawJitter,
    chromatic: reducedDistortion ? Math.min(1, rawChromatic * 0.25) : rawChromatic,
    bandShift: moving ? (reducedDistortion ? 4 : 22) : 0,
    flicker: reducedDistortion ? 0 : (1 - quality) * 0.15,
    reveal,
  };
}

export function formatTimecode(position: number): string {
  const frames = Math.max(0, frameAt(position));
  const seconds = Math.floor(frames / TRANSPORT_FPS);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}:${pad(frames % TRANSPORT_FPS)}`;
}
