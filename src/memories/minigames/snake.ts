import { nextSeed } from './seededRandom';

/**
 * Pure rules for SNAKE.EXE. The UI owns the timer and the keyboard. Each call to advance() moves
 * the snake one cell, so every run can be replayed from its seed.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Cell {
  readonly x: number;
  readonly y: number;
}

export const SNAKE_COLS = 12;
export const SNAKE_ROWS = 12;
/** Apples needed to win the cabinet. */
export const SNAKE_GOAL = 5;
export const SNAKE_POINTS_PER_APPLE = 200;

export interface SnakeState {
  /** Head first. */
  readonly body: readonly Cell[];
  readonly heading: Direction;
  /** The next turn, applied on the following step. Reversing into the body is never queued. */
  readonly queued: Direction | null;
  readonly food: Cell;
  readonly eaten: number;
  readonly seed: number;
  readonly status: 'running' | 'won' | 'lost';
}

const DELTA: Readonly<Record<Direction, Cell>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Readonly<Record<Direction, Direction>> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Picks the next free cell after a seeded starting index, so the apple never lands on the snake. */
export function placeFood(body: readonly Cell[], seed: number): { cell: Cell; seed: number } {
  const next = nextSeed(seed);
  const total = SNAKE_COLS * SNAKE_ROWS;
  const start = next % total;
  for (let offset = 0; offset < total; offset += 1) {
    const index = (start + offset) % total;
    const cell = { x: index % SNAKE_COLS, y: Math.floor(index / SNAKE_COLS) };
    if (!body.some((part) => sameCell(part, cell))) return { cell, seed: next };
  }
  return { cell: { x: 0, y: 0 }, seed: next };
}

export function createSnake(seed = 1): SnakeState {
  const body: Cell[] = [
    { x: 4, y: 6 },
    { x: 3, y: 6 },
    { x: 2, y: 6 },
  ];
  const placed = placeFood(body, seed);
  return { body, heading: 'right', queued: null, food: placed.cell, eaten: 0, seed: placed.seed, status: 'running' };
}

/** Queues a turn. A reversal into the body is ignored, as are turns after the run has ended. */
export function steer(state: SnakeState, direction: Direction): SnakeState {
  if (state.status !== 'running') return state;
  const reference = state.queued ?? state.heading;
  if (direction === reference || direction === OPPOSITE[reference]) return state;
  return { ...state, queued: direction };
}

/** One step: move, eat, grow, or end the run on a wall or on the body. */
export function advance(state: SnakeState): SnakeState {
  if (state.status !== 'running') return state;
  const heading = state.queued ?? state.heading;
  const head = state.body[0]!;
  const delta = DELTA[heading];
  const next: Cell = { x: head.x + delta.x, y: head.y + delta.y };
  const outside = next.x < 0 || next.y < 0 || next.x >= SNAKE_COLS || next.y >= SNAKE_ROWS;
  if (outside) return { ...state, heading, queued: null, status: 'lost' };

  const eats = sameCell(next, state.food);
  const remaining = eats ? state.body : state.body.slice(0, -1);
  if (remaining.some((part) => sameCell(part, next))) return { ...state, heading, queued: null, status: 'lost' };

  const body = [next, ...remaining];
  if (!eats) return { ...state, body, heading, queued: null };

  const eaten = state.eaten + 1;
  if (eaten >= SNAKE_GOAL) return { ...state, body, heading, queued: null, eaten, status: 'won' };
  const placed = placeFood(body, state.seed);
  return { ...state, body, heading, queued: null, eaten, food: placed.cell, seed: placed.seed };
}

export function snakeScore(state: SnakeState): number {
  return state.eaten * SNAKE_POINTS_PER_APPLE;
}
