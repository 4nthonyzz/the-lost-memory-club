import { describe, expect, it } from 'vitest';
import { applyKeyboardLook, applyMouseLook, clampPitch, wrapYaw, type LookKeys } from './look';
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
  }, 30000);
});

describe('applyKeyboardLook', () => {
  const NONE: LookKeys = { yawLeft: false, yawRight: false, pitchUp: false, pitchDown: false };
  const STEP = (90 * Math.PI) / 180 * 0.1; // 90 deg/s over the 0.1 s dt clamp
  const start = { yaw: 0, pitch: 0 };

  it('J turns left, L turns right, I pitches up, K pitches down', () => {
    expect(applyKeyboardLook(start, { ...NONE, yawLeft: true }, 0.1).yaw).toBeCloseTo(STEP, 12);
    expect(applyKeyboardLook(start, { ...NONE, yawRight: true }, 0.1).yaw).toBeCloseTo(-STEP, 12);
    expect(applyKeyboardLook(start, { ...NONE, pitchUp: true }, 0.1).pitch).toBeCloseTo(STEP, 12);
    expect(applyKeyboardLook(start, { ...NONE, pitchDown: true }, 0.1).pitch).toBeCloseTo(-STEP, 12);
  });
  it('rotates 90 degrees per second (4.5 degrees at dt = 0.05)', () => {
    const r = applyKeyboardLook(start, { ...NONE, yawLeft: true }, 0.05);
    expect(r.yaw).toBeCloseTo(Math.PI / 40, 12);
  });
  it('opposing keys cancel', () => {
    expect(applyKeyboardLook(start, { ...NONE, yawLeft: true, yawRight: true }, 0.1)).toEqual(start);
    expect(applyKeyboardLook(start, { ...NONE, pitchUp: true, pitchDown: true }, 0.1)).toEqual(start);
  });
  it('clamps pitch at +/-80 degrees', () => {
    expect(applyKeyboardLook({ yaw: 0, pitch: LIMIT - 0.01 }, { ...NONE, pitchUp: true }, 0.1).pitch).toBe(LIMIT);
    expect(applyKeyboardLook({ yaw: 0, pitch: -LIMIT + 0.01 }, { ...NONE, pitchDown: true }, 0.1).pitch).toBe(-LIMIT);
  });
  it('wraps yaw across PI in both directions', () => {
    const a = applyKeyboardLook({ yaw: Math.PI - 0.01, pitch: 0 }, { ...NONE, yawLeft: true }, 0.1).yaw;
    expect(a).toBeCloseTo(-Math.PI + STEP - 0.01, 12);
    const b = applyKeyboardLook({ yaw: -Math.PI + 0.01, pitch: 0 }, { ...NONE, yawRight: true }, 0.1).yaw;
    expect(b).toBeCloseTo(Math.PI - STEP + 0.01, 12);
  });
  it('does not rotate for dt = 0, negative, NaN or Infinity', () => {
    const look = { yaw: 0.5, pitch: 0.2 };
    const all: LookKeys = { yawLeft: true, yawRight: false, pitchUp: true, pitchDown: false };
    for (const dt of [0, -1, NaN, Infinity, -Infinity]) {
      expect(applyKeyboardLook(look, all, dt)).toEqual(look);
    }
  });
  it('clamps dt larger than 0.1', () => {
    const keys = { ...NONE, yawLeft: true };
    expect(applyKeyboardLook(start, keys, 5).yaw).toBeCloseTo(STEP, 12);
  });
  it('combines yaw and pitch on diagonals', () => {
    const r = applyKeyboardLook(start, { yawLeft: true, yawRight: false, pitchUp: false, pitchDown: true }, 0.1);
    expect(r.yaw).toBeCloseTo(STEP, 12);
    expect(r.pitch).toBeCloseTo(-STEP, 12);
  });
  it('sanitizes a non-finite input look', () => {
    const r = applyKeyboardLook({ yaw: NaN, pitch: NaN }, { ...NONE, yawLeft: true, pitchUp: true }, 0.1);
    expect(Number.isFinite(r.yaw)).toBe(true);
    expect(Number.isFinite(r.pitch)).toBe(true);
  });
});