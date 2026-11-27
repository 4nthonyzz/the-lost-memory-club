import { describe, expect, it } from 'vitest';
import type { Aabb } from '../worldTypes';
import { DT_MAX, PLAYER_RADIUS, WALK_SPEED } from './constants';
import {
  clampToBounds,
  moveWithCollision,
  overlapsAny,
  relocateToValid,
  resolveAll,
  resolveCircleAabb,
} from './collision';

const R = PLAYER_RADIUS;
const box: Aabb = { minX: -1, maxX: 1, minZ: -1, maxZ: 1 };
const bounds: Aabb = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };

describe('resolveCircleAabb', () => {
  it('returns the same point when far away', () => {
    const p = { x: 5, z: 5 };
    expect(resolveCircleAabb(p, R, box)).toBe(p);
  });

  it('does not overlap when touching a wall exactly', () => {
    const p = { x: 1 + R, z: 0 };
    expect(resolveCircleAabb(p, R, box)).toBe(p);
    expect(overlapsAny(p, R, [box])).toBe(false);
  });

  it('pushes out of a face to exactly r', () => {
    const out = resolveCircleAabb({ x: 1.1, z: 0 }, R, box);
    expect(out.x).toBeCloseTo(1 + R, 9);
    expect(out.z).toBeCloseTo(0, 9);
  });

  it('pushes out of a corner along the diagonal', () => {
    const out = resolveCircleAabb({ x: 1.1, z: 1.1 }, R, box);
    expect(Math.hypot(out.x - 1, out.z - 1)).toBeCloseTo(R, 9);
  });

  it('pushes a centre inside the box out along the least-penetration axis', () => {
    const out = resolveCircleAabb({ x: 0.9, z: 0 }, R, box);
    expect(out).toEqual({ x: 1 + R, z: 0 });
  });
});

describe('resolveAll', () => {
  it('resolves against multiple boxes', () => {
    const other: Aabb = { minX: 1.2, maxX: 3, minZ: -1, maxZ: 1 };
    const out = resolveAll({ x: 1.1, z: 0 }, 0.1, [box, other]);
    expect(overlapsAny(out, 0.1, [box, other])).toBe(false);
  });
});

describe('clampToBounds', () => {
  it('keeps the circle inside the bounds', () => {
    expect(clampToBounds({ x: 50, z: -50 }, R, bounds)).toEqual({ x: 10 - R, z: -10 + R });
  });
  it('leaves valid points untouched', () => {
    const p = { x: 1, z: 1 };
    expect(clampToBounds(p, R, bounds)).toBe(p);
  });
});

describe('moveWithCollision', () => {
  it('moves freely with no obstacles', () => {
    const out = moveWithCollision({ x: 0, z: 0 }, { x: 1, z: 2 }, R, [], bounds);
    expect(out.x).toBeCloseTo(1, 9);
    expect(out.z).toBeCloseTo(2, 9);
  });

  it('returns the same position for zero or non-finite displacement', () => {
    const p = { x: 2, z: 2 };
    expect(moveWithCollision(p, { x: 0, z: 0 }, R, [box], bounds)).toBe(p);
    expect(moveWithCollision(p, { x: NaN, z: 1 }, R, [box], bounds)).toBe(p);
  });

  it('slides along a wall, keeping the tangential component', () => {
    const wall: Aabb = { minX: 2, maxX: 2.2, minZ: -5, maxZ: 5 };
    const start = { x: 2 - R - 0.05, z: 0 };
    const out = moveWithCollision(start, { x: 0.5, z: 0.5 }, R, [wall], bounds);
    expect(out.z).toBeCloseTo(0.5, 6);
    expect(out.x).toBeLessThanOrEqual(2 - R + 1e-9);
    expect(overlapsAny(out, R, [wall])).toBe(false);
  });

  it('does not tunnel through a 0.15-thick collider at WALK_SPEED * DT_MAX', () => {
    const thin: Aabb = { minX: 0, maxX: 0.15, minZ: -5, maxZ: 5 };
    const start = { x: -R - 0.01, z: 0 };
    let pos = start;
    for (let i = 0; i < 20; i++) {
      pos = moveWithCollision(pos, { x: WALK_SPEED * DT_MAX, z: 0 }, R, [thin], bounds);
      expect(pos.x).toBeLessThanOrEqual(-R + 1e-9);
    }
    expect(overlapsAny(pos, R, [thin])).toBe(false);
  });

  it('stays inside bounds', () => {
    const out = moveWithCollision({ x: 9, z: 0 }, { x: 5, z: 0 }, R, [], bounds);
    expect(out.x).toBeCloseTo(10 - R, 9);
  });
});

describe('overlapsAny', () => {
  it('detects penetration and ignores empty lists', () => {
    expect(overlapsAny({ x: 1.1, z: 0 }, R, [box])).toBe(true);
    expect(overlapsAny({ x: 0, z: 0 }, R, [])).toBe(false);
  });
});

describe('relocateToValid', () => {
  const fallback = { x: 5, z: 5 };

  it('returns a valid position unchanged', () => {
    const p = { x: 5, z: 0 };
    expect(relocateToValid(p, R, [box], bounds, fallback)).toEqual(p);
  });

  it('relocates a start inside a collider to a valid point', () => {
    const out = relocateToValid({ x: 0, z: 0 }, R, [box], bounds, fallback);
    expect(overlapsAny(out, R, [box])).toBe(false);
  });

  it('uses the grid search when resolve alone lands in another collider', () => {
    // Two boxes with a gap too small for the circle: push-out from one lands in the other.
    const a: Aabb = { minX: -1, maxX: 0, minZ: -1, maxZ: 1 };
    const b: Aabb = { minX: 0.2, maxX: 1.2, minZ: -1, maxZ: 1 };
    const out = relocateToValid({ x: 0.1, z: 0 }, R, [a, b], bounds, fallback);
    expect(overlapsAny(out, R, [a, b])).toBe(false);
  });

  it('returns the fallback when nothing valid is found', () => {
    const huge: Aabb = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
    expect(relocateToValid({ x: 0, z: 0 }, R, [huge], bounds, fallback)).toBe(fallback);
  });
});
