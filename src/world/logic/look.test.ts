import { describe, expect, it } from 'vitest';
import { applyMouseLook, clampPitch, wrapYaw } from './look';
import { MOUSE_SENSITIVITY } from './constants';

const LIMIT = (80 * Math.PI) / 180;

describe('clampPitch', () => {
  it('accepts exactly 80 degrees in both directions', () => {
    expect(clampPitch(LIMIT)).toBe(LIMIT);
    expect(clampPitch(-LIMIT)).toBe(-LIMIT);
  });
  it('clamps beyond the limit', () => {
    expect(clampPitch(2)).toBe(LIMIT);
    expect(clampPitch(-2)).toBe(-LIMIT);
    expect(clampPitch(Infinity)).toBe(LIMIT);
  });
  it('maps NaN to 0 and keeps typical values', () => {
    expect(clampPitch(NaN)).toBe(0);
    expect(clampPitch(0.3)).toBe(0.3);
  });
});

describe('wrapYaw', () => {
  it('keeps values in (-PI, PI] unchanged, including PI', () => {
    expect(wrapYaw(1)).toBe(1);
    expect(wrapYaw(Math.PI)).toBe(Math.PI);
  });
  it('wraps -PI to PI and large values into range', () => {
    expect(wrapYaw(-Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(wrapYaw(3 * Math.PI)).toBeCloseTo(Math.PI, 9);
    const w = wrapYaw(7);
    expect(w).toBeGreaterThan(-Math.PI);
    expect(w).toBeLessThanOrEqual(Math.PI);
  });
  it('maps non-finite to 0', () => {
    expect(wrapYaw(NaN)).toBe(0);
    expect(wrapYaw(Infinity)).toBe(0);
    expect(wrapYaw(-Infinity)).toBe(0);
  });
});

describe('applyMouseLook', () => {
  it('applies yaw -= dx*s and pitch -= dy*s', () => {
    const r = applyMouseLook({ yaw: 0, pitch: 0 }, 100, 50);
    expect(r.yaw).toBeCloseTo(-100 * MOUSE_SENSITIVITY, 12);
    expect(r.pitch).toBeCloseTo(-50 * MOUSE_SENSITIVITY, 12);
  });
  it('accepts a delta of exactly 500 and ignores 501', () => {
    expect(applyMouseLook({ yaw: 0, pitch: 0 }, 500, 0).yaw).not.toBe(0);
    expect(applyMouseLook({ yaw: 0.5, pitch: 0.1 }, 501, 0)).toEqual({ yaw: 0.5, pitch: 0.1 });
    expect(applyMouseLook({ yaw: 0.5, pitch: 0.1 }, 0, -501)).toEqual({ yaw: 0.5, pitch: 0.1 });
  });
  it('ignores only the offending axis and non-finite deltas', () => {
    const r = applyMouseLook({ yaw: 0, pitch: 0 }, NaN, 100);
    expect(r.yaw).toBe(0);
    expect(r.pitch).toBeCloseTo(-100 * MOUSE_SENSITIVITY, 12);
    expect(applyMouseLook({ yaw: 0, pitch: 0 }, Infinity, -Infinity)).toEqual({ yaw: 0, pitch: 0 });
  });
  it('clamps pitch at the limit', () => {
    expect(applyMouseLook({ yaw: 0, pitch: 0 }, 0, -500, 1).pitch).toBe(LIMIT);
    expect(applyMouseLook({ yaw: 0, pitch: 0 }, 0, 500, 1).pitch).toBe(-LIMIT);
  });
  it('keeps yaw finite and in range after repeated large inputs', () => {
    let look = { yaw: 0, pitch: 0 };
    for (let i = 0; i < 10000; i++) {
      look = applyMouseLook(look, 500, 500, 10);
      expect(Number.isFinite(look.yaw)).toBe(true);
      expect(look.yaw).toBeGreaterThan(-Math.PI);
      expect(look.yaw).toBeLessThanOrEqual(Math.PI);
    }
  });
});
