import { describe, expect, it } from 'vitest';
import type { MovementInput } from '../worldTypes';
import { DT_MAX, WALK_SPEED } from './constants';
import { clampDt, inputVector, stepMovement } from './movement';

const none: MovementInput = { forward: false, backward: false, left: false, right: false };
const keys = (o: Partial<MovementInput>): MovementInput => ({ ...none, ...o });

describe('clampDt', () => {
  it('passes typical values through', () => {
    expect(clampDt(0.016)).toBe(0.016);
  });
  it('keeps dt exactly DT_MAX and clamps above it', () => {
    expect(clampDt(0.1)).toBe(0.1);
    expect(clampDt(0.1)).toBe(DT_MAX);
    expect(clampDt(5)).toBe(DT_MAX);
  });
  it('returns 0 for NaN, negative, zero and infinite-negative', () => {
    expect(clampDt(NaN)).toBe(0);
    expect(clampDt(-0.5)).toBe(0);
    expect(clampDt(0)).toBe(0);
    expect(clampDt(-Infinity)).toBe(0);
  });
});

describe('inputVector', () => {
  it('is zero with no keys', () => {
    expect(inputVector(none, 0)).toEqual({ x: 0, z: 0 });
  });
  it('forward at yaw 0 is -z', () => {
    const v = inputVector(keys({ forward: true }), 0);
    expect(v.x).toBeCloseTo(0);
    expect(v.z).toBeCloseTo(-1);
  });
  it('forward at yaw PI/2 is -x; right at yaw PI/2 is -z', () => {
    const f = inputVector(keys({ forward: true }), Math.PI / 2);
    expect(f.x).toBeCloseTo(-1);
    expect(f.z).toBeCloseTo(0);
    const r = inputVector(keys({ right: true }), Math.PI / 2);
    expect(r.x).toBeCloseTo(0);
    expect(r.z).toBeCloseTo(-1);
  });
  it('right at yaw 0 is +x, left is -x, backward is +z', () => {
    expect(inputVector(keys({ right: true }), 0).x).toBeCloseTo(1);
    expect(inputVector(keys({ left: true }), 0).x).toBeCloseTo(-1);
    expect(inputVector(keys({ backward: true }), 0).z).toBeCloseTo(1);
  });
  it('opposing keys cancel', () => {
    expect(inputVector(keys({ forward: true, backward: true }), 0.7)).toEqual({ x: 0, z: 0 });
    expect(inputVector(keys({ left: true, right: true }), 0.7)).toEqual({ x: 0, z: 0 });
  });
  it('one axis cancelled leaves the other axis at full length', () => {
    const v = inputVector(keys({ forward: true, backward: true, right: true }), 0);
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(1);
    expect(v.x).toBeCloseTo(1);
  });
  it('diagonal length equals single-axis length', () => {
    for (const yaw of [0, 0.3, Math.PI / 2, -2]) {
      const single = inputVector(keys({ forward: true }), yaw);
      const diag = inputVector(keys({ forward: true, right: true }), yaw);
      expect(Math.hypot(diag.x, diag.z)).toBeCloseTo(Math.hypot(single.x, single.z));
      expect(Math.hypot(diag.x, diag.z)).toBeCloseTo(1);
    }
  });
});

describe('stepMovement', () => {
  it('moves forward by speed * dt at yaw 0', () => {
    const p = stepMovement({ x: 1, z: 1 }, 0, keys({ forward: true }), 0.05);
    expect(p.x).toBeCloseTo(1);
    expect(p.z).toBeCloseTo(1 - WALK_SPEED * 0.05);
  });
  it('does not move without input', () => {
    expect(stepMovement({ x: 2, z: 3 }, 1, none, 0.05)).toEqual({ x: 2, z: 3 });
  });
  it('clamps large dt to DT_MAX', () => {
    const p = stepMovement({ x: 0, z: 0 }, 0, keys({ right: true }), 10);
    expect(p.x).toBeCloseTo(WALK_SPEED * DT_MAX);
  });
  it('does not move for NaN or negative dt', () => {
    expect(stepMovement({ x: 0, z: 0 }, 0, keys({ forward: true }), NaN)).toEqual({ x: 0, z: 0 });
    const p = stepMovement({ x: 0, z: 0 }, 0, keys({ forward: true }), -1);
    expect(p.x).toBeCloseTo(0);
    expect(p.z).toBeCloseTo(0);
  });
  it('honors a custom speed', () => {
    const p = stepMovement({ x: 0, z: 0 }, 0, keys({ right: true }), 0.1, 10);
    expect(p.x).toBeCloseTo(1);
  });
});
