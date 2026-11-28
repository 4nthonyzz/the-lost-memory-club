/**
 * Pure rules for DEAD FREQUENCY: tune the dial onto the signal and hold the lock.
 * The lock only counts while the dial sits inside the target band and the player holds the key.
 */

export const DIAL_MIN = 0;
export const DIAL_MAX = 100;
export const DIAL_START = 20;
export const DIAL_TARGET = 62;
export const DIAL_TOLERANCE = 3;
export const DIAL_STEP = 2;
export const LOCK_MS = 1500;
export const DEAD_PERFECT_SCORE = 1000;
export const DEAD_ADJUSTMENT_PENALTY = 10;
export const DEAD_MIN_SCORE = 100;

export interface DeadFrequencyState {
  readonly dial: number;
  readonly holding: boolean;
  readonly lockedMs: number;
  readonly adjustments: number;
  readonly status: 'running' | 'won';
}

export function createDeadFrequency(): DeadFrequencyState {
  return { dial: DIAL_START, holding: false, lockedMs: 0, adjustments: 0, status: 'running' };
}

export function inLockBand(dial: number): boolean {
  return Math.abs(dial - DIAL_TARGET) <= DIAL_TOLERANCE;
}

export function tune(state: DeadFrequencyState, direction: -1 | 1): DeadFrequencyState {
  if (state.status !== 'running') return state;
  const dial = Math.min(DIAL_MAX, Math.max(DIAL_MIN, state.dial + direction * DIAL_STEP));
  if (dial === state.dial) return state;
  return { ...state, dial, adjustments: state.adjustments + 1 };
}

export function setHolding(state: DeadFrequencyState, holding: boolean): DeadFrequencyState {
  if (state.status !== 'running' || state.holding === holding) return state;
  return { ...state, holding, lockedMs: holding ? state.lockedMs : 0 };
}

/** Advances the lock timer by the elapsed milliseconds. Leaving the band or the key resets progress. */
export function tick(state: DeadFrequencyState, elapsedMs: number): DeadFrequencyState {
  if (state.status !== 'running') return state;
  if (!state.holding || !inLockBand(state.dial)) {
    return state.lockedMs === 0 ? state : { ...state, lockedMs: 0 };
  }
  const lockedMs = state.lockedMs + Math.max(0, elapsedMs);
  if (lockedMs >= LOCK_MS) return { ...state, lockedMs: LOCK_MS, status: 'won' };
  return { ...state, lockedMs };
}

export function deadFrequencyScore(state: DeadFrequencyState): number {
  return Math.max(DEAD_MIN_SCORE, DEAD_PERFECT_SCORE - state.adjustments * DEAD_ADJUSTMENT_PENALTY);
}
