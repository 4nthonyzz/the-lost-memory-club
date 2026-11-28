import { nextSeed } from './seededRandom';

/**
 * Pure rules for SHADOW FIGHT: repeat the shadow's stance. Each round is longer than the last.
 * A wrong input resets the current round without ending the run, and each miss costs points.
 */

export type Move = 'up' | 'down' | 'left' | 'right';

export const SHADOW_ROUNDS = 3;
export const SHADOW_PERFECT_SCORE = 1000;
export const SHADOW_MISS_PENALTY = 100;
export const SHADOW_MIN_SCORE = 100;

const MOVES: readonly Move[] = ['up', 'down', 'left', 'right'];

export interface ShadowFightState {
  /** Zero-based round. Equals SHADOW_ROUNDS once the run is won. */
  readonly round: number;
  readonly sequence: readonly Move[];
  readonly entered: readonly Move[];
  readonly misses: number;
  readonly seed: number;
  readonly status: 'running' | 'won';
}

function lengthForRound(round: number): number {
  return 3 + round;
}

function sequenceFor(seed: number, length: number): { sequence: Move[]; seed: number } {
  let current = seed;
  const sequence: Move[] = [];
  for (let index = 0; index < length; index += 1) {
    current = nextSeed(current);
    sequence.push(MOVES[(current >>> 16) % MOVES.length]!);
  }
  return { sequence, seed: current };
}

export function createShadowFight(seed = 7): ShadowFightState {
  const first = sequenceFor(seed, lengthForRound(0));
  return { round: 0, sequence: first.sequence, entered: [], misses: 0, seed: first.seed, status: 'running' };
}

export function press(state: ShadowFightState, move: Move): ShadowFightState {
  if (state.status !== 'running') return state;
  if (move !== state.sequence[state.entered.length]) {
    return { ...state, entered: [], misses: state.misses + 1 };
  }
  const entered = [...state.entered, move];
  if (entered.length < state.sequence.length) return { ...state, entered };

  const round = state.round + 1;
  if (round >= SHADOW_ROUNDS) return { ...state, entered, round, status: 'won' };
  const next = sequenceFor(state.seed, lengthForRound(round));
  return { ...state, round, sequence: next.sequence, seed: next.seed, entered: [] };
}

export function shadowScore(state: ShadowFightState): number {
  return Math.max(SHADOW_MIN_SCORE, SHADOW_PERFECT_SCORE - state.misses * SHADOW_MISS_PENALTY);
}
