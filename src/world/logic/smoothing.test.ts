import { describe, expect, it } from 'vitest';
import { dampAngle, dampScalar, dampVec2, smoothingAlpha } from './smoothing';

describe('smoothingAlpha', () => {
  it('is within 0..1 and matches 1 - exp(-lambda * dt)', () => {
    expect(smoothingAlpha(32, 0.05)).toBeCloseTo(1 - Math.exp(-1.6), 12);
    for (const dt of [0.001, 0.016, 0.1, 5]) {
      const a = smoothingAlpha(20, dt);
      expect(a).toBeGreaterThan(0);
      expect(a).toBeLessThanOrEqual(1);
    }
  });
  it('is 0 for non-positive or non-finite dt and 1 for infinite lambda', () => {
    for (const dt of [0, -1, NaN, Infinity]) expect(smoothingAlpha(32, dt)).toBe(0);
    expect(smoothingAlpha(Infinity, 0.016)).toBe(1);
  });
  it('two half steps compose to one full step', () => {
    const dt = 0.08;
    const half = smoothingAlpha(32, dt / 2);
    const full = smoothingAlpha(32, dt);
    const twice = dampScalar(dampScalar(0, 1, half), 1, half);
    expect(twice).toBeCloseTo(dampScalar(0, 1, full), 9);
  });
});

describe('damp helpers', () => {
  it('dampScalar and dampVec2 move toward the target without overshoot', () => {
    expect(dampScalar(0, 10, 0.25)).toBeCloseTo(2.5, 12);
    expect(dampScalar(0, 10, 1)).toBe(10);
    expect(dampScalar(3, 10, 0)).toBe(3);
    expect(dampVec2({ x: 0, z: 4 }, { x: 8, z: 0 }, 0.5)).toEqual({ x: 4, z: 2 });
  });
  it('non-finite alpha leaves the value unchanged', () => {
    expect(dampScalar(1, 5, NaN)).toBe(1);
    expect(dampAngle(1, 2, NaN)).toBe(1);
  });
  it('dampAngle takes the shortest arc across +/-PI', () => {
    const r = dampAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.5);
    expect(Math.abs(Math.abs(r) - Math.PI)).toBeLessThan(1e-9);
    const r2 = dampAngle(-Math.PI + 0.1, Math.PI - 0.1, 0.25);
    expect(r2).toBeLessThan(0);
    expect(r2).toBeLessThan(-Math.PI + 0.1);
    expect(dampAngle(0, 1, 0.5)).toBeCloseTo(0.5, 12);
  });
});
