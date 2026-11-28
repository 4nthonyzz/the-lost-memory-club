import { describe, expect, it } from 'vitest';
import { advance, createSnake, placeFood, SNAKE_COLS, SNAKE_GOAL, SNAKE_ROWS, snakeScore, steer, type Cell, type SnakeState } from './snake';
import { createShadowFight, press, SHADOW_ROUNDS, shadowScore, type Move } from './shadowFight';
import {
  createDeadFrequency,
  DIAL_MAX,
  DIAL_MIN,
  DIAL_TARGET,
  deadFrequencyScore,
  inLockBand,
  LOCK_MS,
  setHolding,
  tick,
  tune,
} from './deadFrequency';

function snakeWith(overrides: Partial<SnakeState>): SnakeState {
  return { ...createSnake(3), ...overrides };
}

describe('SNAKE.EXE rules', () => {
  it('moves one cell per step in the queued direction', () => {
    const moved = advance(snakeWith({ food: { x: 0, y: 0 } }));
    expect(moved.body[0]).toEqual({ x: 5, y: 6 });
    expect(moved.body).toHaveLength(3);
  });

  it('ignores a reversal into its own body', () => {
    const state = createSnake(3);
    expect(steer(state, 'left')).toBe(state);
    expect(steer(state, 'up').queued).toBe('up');
  });

  it('places food on a free cell only, for any seed', () => {
    for (let seed = 1; seed < 60; seed += 1) {
      const snake = createSnake(seed);
      expect(snake.body.some((part) => part.x === snake.food.x && part.y === snake.food.y)).toBe(false);
      expect(snake.food.x).toBeGreaterThanOrEqual(0);
      expect(snake.food.x).toBeLessThan(SNAKE_COLS);
      expect(snake.food.y).toBeLessThan(SNAKE_ROWS);
    }
  });

  it('is deterministic for a given seed', () => {
    expect(createSnake(42).food).toEqual(createSnake(42).food);
    expect(placeFood([], 5).cell).toEqual(placeFood([], 5).cell);
  });

  it('loses on a wall', () => {
    const edge = snakeWith({ body: [{ x: SNAKE_COLS - 1, y: 0 }, { x: SNAKE_COLS - 2, y: 0 }], heading: 'right', queued: null });
    expect(advance(edge).status).toBe('lost');
  });

  it('loses when the head runs into the body', () => {
    const coiled: Cell[] = [
      { x: 5, y: 5 },
      { x: 5, y: 4 },
      { x: 4, y: 4 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
    ];
    const state = snakeWith({ body: coiled, heading: 'down', queued: 'left', food: { x: 0, y: 0 } });
    expect(advance(state).status).toBe('lost');
  });

  it('grows and scores each apple, and wins after the goal', () => {
    let state = snakeWith({ body: [{ x: 4, y: 6 }, { x: 3, y: 6 }, { x: 2, y: 6 }], food: { x: 5, y: 6 }, eaten: 0 });
    state = advance(state);
    expect(state.eaten).toBe(1);
    expect(state.body).toHaveLength(4);
    expect(snakeScore(state)).toBe(200);
    state = { ...state, eaten: SNAKE_GOAL - 1, food: { x: state.body[0]!.x + 1, y: state.body[0]!.y } };
    expect(advance(state).status).toBe('won');
  });

  it('stops changing once the run has ended', () => {
    const lost = snakeWith({ status: 'lost' });
    expect(advance(lost)).toBe(lost);
    expect(steer(lost, 'up')).toBe(lost);
  });
});

describe('SHADOW FIGHT rules', () => {
  const sequenceOf = (state: ReturnType<typeof createShadowFight>): Move[] => [...state.sequence];

  it('wins after repeating every round in order', () => {
    let state = createShadowFight(7);
    for (let round = 0; round < SHADOW_ROUNDS; round += 1) {
      for (const move of sequenceOf(state)) state = press(state, move);
    }
    expect(state.status).toBe('won');
    expect(shadowScore(state)).toBe(1000);
  });

  it('keeps the run alive on a miss and counts the miss', () => {
    const state = createShadowFight(7);
    const wrong = (['up', 'down', 'left', 'right'] as Move[]).find((move) => move !== state.sequence[0])!;
    const after = press(state, wrong);
    expect(after.status).toBe('running');
    expect(after.misses).toBe(1);
    expect(after.entered).toEqual([]);
    expect(shadowScore(after)).toBe(900);
  });

  it('makes each round at least as long as the one before', () => {
    let state = createShadowFight(11);
    let previous = state.sequence.length;
    for (let round = 0; round < SHADOW_ROUNDS - 1; round += 1) {
      for (const move of sequenceOf(state)) state = press(state, move);
      expect(state.sequence.length).toBeGreaterThanOrEqual(previous);
      previous = state.sequence.length;
    }
  });
});

describe('DEAD FREQUENCY rules', () => {
  it('clamps the dial inside its range', () => {
    let state = createDeadFrequency();
    for (let step = 0; step < 100; step += 1) state = tune(state, -1);
    expect(state.dial).toBe(DIAL_MIN);
    for (let step = 0; step < 100; step += 1) state = tune(state, 1);
    expect(state.dial).toBe(DIAL_MAX);
  });

  it('needs the dial in the band and the key held for the whole lock time', () => {
    let state = createDeadFrequency();
    while (!inLockBand(state.dial)) state = tune(state, state.dial < DIAL_TARGET ? 1 : -1);
    state = setHolding(state, true);
    state = tick(state, LOCK_MS - 100);
    expect(state.status).toBe('running');
    state = tick(state, 200);
    expect(state.status).toBe('won');
  });

  it('resets the lock when the key is released or the dial leaves the band', () => {
    let state = createDeadFrequency();
    while (!inLockBand(state.dial)) state = tune(state, state.dial < DIAL_TARGET ? 1 : -1);
    const held = tick(setHolding(state, true), 800);
    expect(held.lockedMs).toBe(800);
    expect(tick(setHolding(held, false), 0).lockedMs).toBe(0);

    let away = held;
    while (inLockBand(away.dial)) away = tune(away, away.dial < DIAL_TARGET ? -1 : 1);
    expect(tick(away, 500).lockedMs).toBe(0);
  });

  it('scores fewer adjustments higher', () => {
    expect(deadFrequencyScore({ ...createDeadFrequency(), adjustments: 0 })).toBe(1000);
    expect(deadFrequencyScore({ ...createDeadFrequency(), adjustments: 10_000 })).toBe(100);
    expect(DIAL_TARGET).toBeGreaterThan(DIAL_MIN);
  });
});
