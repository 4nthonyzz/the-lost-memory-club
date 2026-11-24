import { describe, expect, it } from 'vitest';
import type { Aabb } from '../worldTypes';
import { PITCH_LIMIT_DEG } from './constants';
import type { InputMode } from './inputMode';
import type { HeldKeys, KeyRole } from './inputState';
import { stepPlayer, type PlayerStepInput } from './playerStep';

const BOUNDS: Aabb = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };

function keys(...roles: KeyRole[]): HeldKeys {
  return { roles: new Set<KeyRole>(roles) };
}

function input(over: Partial<PlayerStepInput> = {}): PlayerStepInput {
  return {
    pos: { x: 0, z: 0 },
    look: { yaw: 0, pitch: 0 },
    keys: keys(),
    mouseDelta: { x: 0, y: 0 },
    dt: 0.05,
    mode: 'active',
    colliders: [],
    bounds: BOUNDS,
    ...over,
  };
}

describe('stepPlayer keyboard look', () => {
  for (const mode of ['active', 'capturePending'] as InputMode[]) {
    it(`I/J/K/L change look in ${mode}`, () => {
      expect(stepPlayer(input({ mode, keys: keys('yawLeft') })).look.yaw).toBeGreaterThan(0);
      expect(stepPlayer(input({ mode, keys: keys('yawRight') })).look.yaw).toBeLessThan(0);
      expect(stepPlayer(input({ mode, keys: keys('pitchUp') })).look.pitch).toBeGreaterThan(0);
      expect(stepPlayer(input({ mode, keys: keys('pitchDown') })).look.pitch).toBeLessThan(0);
    });
  }

  it('changes nothing in inspecting, even with keys and mouse delta', () => {
    const i = input({
      mode: 'inspecting',
      keys: keys('forward', 'yawLeft', 'pitchUp'),
      mouseDelta: { x: 20, y: 20 },
      look: { yaw: 0.3, pitch: 0.1 },
      pos: { x: 1, z: 2 },
    });
    const r = stepPlayer(i);
    expect(r.pos).toEqual({ x: 1, z: 2 });
    expect(r.look).toEqual({ yaw: 0.3, pitch: 0.1 });
  });

  it('opposing keys cancel', () => {
    const r = stepPlayer(input({ keys: keys('yawLeft', 'yawRight', 'pitchUp', 'pitchDown') }));
    expect(r.look).toEqual({ yaw: 0, pitch: 0 });
  });

  it('dt 0 or NaN gives no rotation or movement', () => {
    for (const dt of [0, NaN]) {
      const r = stepPlayer(input({ dt, keys: keys('yawLeft', 'pitchUp', 'forward') }));
      expect(r.look).toEqual({ yaw: 0, pitch: 0 });
      expect(r.pos).toEqual({ x: 0, z: 0 });
    }
  });

  it('clamps pitch', () => {
    const limit = (PITCH_LIMIT_DEG * Math.PI) / 180;
    const r = stepPlayer(input({ look: { yaw: 0, pitch: limit - 0.001 }, keys: keys('pitchUp') }));
    expect(r.look.pitch).toBeCloseTo(limit, 10);
  });

  it('applies mouse look together with keyboard look', () => {
    const r = stepPlayer(input({ mouseDelta: { x: 10, y: 0 }, keys: keys('yawLeft') }));
    const mouseOnly = stepPlayer(input({ mouseDelta: { x: 10, y: 0 } }));
    expect(r.look.yaw).toBeGreaterThan(mouseOnly.look.yaw);
  });
});

describe('stepPlayer movement', () => {
  it('moves forward (-z at yaw 0)', () => {
    const r = stepPlayer(input({ keys: keys('forward') }));
    expect(r.pos.z).toBeLessThan(0);
  });

  it('still resolves collisions', () => {
    const wall: Aabb = { minX: -5, maxX: 5, minZ: -1.0, maxZ: -0.5 };
    let pos = { x: 0, z: 0 };
    for (let n = 0; n < 60; n++) {
      pos = stepPlayer(input({ pos, keys: keys('forward'), colliders: [wall] })).pos;
    }
    expect(pos.z).toBeGreaterThanOrEqual(-0.5 + 0.35 - 1e-9);
  });
});
