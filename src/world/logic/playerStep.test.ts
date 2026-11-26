import { describe, expect, it } from 'vitest';
import type { Aabb } from '../worldTypes';
import { PITCH_LIMIT_DEG, WALK_SPEED } from './constants';
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
    const r = stepPlayer(input({ look: { yaw: 0, pitch: limit - 0.001 }, keys: keys('pitchUp'), reducedMotion: true }));
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

describe('stepPlayer smoothing', () => {
  const L = (r: ReturnType<typeof stepPlayer>) => r.look.yaw;
  function run(fps: number, seconds: number, over: Partial<PlayerStepInput> = {}) {
    const dt = 1 / fps;
    let pos = { x: 0, z: 0 };
    let look = { yaw: 0, pitch: 0 };
    let targetLook = { yaw: 0, pitch: 0 };
    let velocity = { x: 0, z: 0 };
    const n = Math.round(seconds * fps);
    for (let k = 0; k < n; k++) {
      const r = stepPlayer(input({ pos, look, targetLook, velocity, dt, ...over }));
      ({ pos, look, targetLook, velocity } = { pos: r.pos, look: r.look, targetLook: r.targetLook, velocity: r.velocity });
    }
    return { pos, look, velocity };
  }

  it('look is more than 99% converged after 0.15 s at lambda 32', () => {
    const target = { yaw: 1, pitch: 0.5 };
    let look = { yaw: 0, pitch: 0 };
    for (let k = 0; k < 9; k++) {
      look = stepPlayer(input({ look, targetLook: target, dt: 1 / 60 })).look;
    }
    // 9 frames of 1/60 s = 0.15 s
    expect(look.yaw).toBeGreaterThan(0.99);
    expect(look.pitch).toBeGreaterThan(0.495);
  });

  it('never overshoots the look target or the target velocity', () => {
    const target = { yaw: 0.8, pitch: 0.3 };
    let look = { yaw: 0, pitch: 0 };
    let velocity = { x: 0, z: 0 };
    let pos = { x: 0, z: 5 };
    for (let k = 0; k < 120; k++) {
      const r = stepPlayer(input({ pos, look: { yaw: 0, pitch: 0 }, targetLook: target, dt: 1 / 30 }));
      look = stepPlayer(input({ look, targetLook: target, dt: 1 / 30 })).look;
      expect(look.yaw).toBeLessThanOrEqual(0.8 + 1e-12);
      expect(look.pitch).toBeLessThanOrEqual(0.3 + 1e-12);
      const m = stepPlayer(input({ pos, velocity, keys: keys('forward'), dt: 1 / 30 }));
      velocity = m.velocity;
      pos = { x: 0, z: 5 };
      expect(Math.abs(velocity.z)).toBeLessThanOrEqual(WALK_SPEED + 1e-9);
      void r;
    }
  });

  it('accelerates toward walk speed and decelerates to a stop', () => {
    const a = run(60, 0.05, { keys: keys('forward') });
    const b = run(60, 1, { keys: keys('forward') });
    const speedA = Math.hypot(a.velocity.x, a.velocity.z);
    const speedB = Math.hypot(b.velocity.x, b.velocity.z);
    expect(speedA).toBeGreaterThan(0);
    expect(speedA).toBeLessThan(speedB);
    // Release: velocity decays but is still non-zero on the next frame.
    const r1 = stepPlayer(input({ velocity: b.velocity, dt: 1 / 60 }));
    expect(Math.hypot(r1.velocity.x, r1.velocity.z)).toBeGreaterThan(0);
    expect(Math.hypot(r1.velocity.x, r1.velocity.z)).toBeLessThan(speedB);
    let v = b.velocity;
    let pos = b.pos;
    for (let k = 0; k < 120; k++) {
      const r = stepPlayer(input({ pos, velocity: v, dt: 1 / 60 }));
      v = r.velocity;
      pos = r.pos;
    }
    expect(v).toEqual({ x: 0, z: 0 });
  });

  it('gives nearly the same result at 30, 60 and 144 fps', () => {
    const over = { keys: keys('forward', 'yawLeft') };
    const r30 = run(30, 1, over);
    const r60 = run(60, 1, over);
    const r144 = run(144, 1, over);
    for (const r of [r30, r144]) {
      expect(Math.abs(r.look.yaw - r60.look.yaw)).toBeLessThan(0.02);
      expect(Math.abs(r.pos.z - r60.pos.z)).toBeLessThan(0.1);
    }
  });

  it('never penetrates a wall and zeroes the into-wall velocity', () => {
    const wall: Aabb = { minX: -5, maxX: 5, minZ: -1.0, maxZ: -0.5 };
    let pos = { x: 0, z: 0 };
    let velocity = { x: 0, z: 0 };
    for (let k = 0; k < 120; k++) {
      const r = stepPlayer(input({ pos, velocity, keys: keys('forward'), colliders: [wall], dt: 1 / 60 }));
      pos = r.pos;
      velocity = r.velocity;
      expect(pos.z).toBeGreaterThanOrEqual(-0.5 + 0.35 - 1e-9);
    }
    expect(velocity.z).toBeGreaterThanOrEqual(-1e-9);
  });

  it('keeps the player inside the bounds', () => {
    const r = run(60, 10, { keys: keys('forward') });
    expect(r.pos.z).toBeGreaterThanOrEqual(BOUNDS.minZ);
    expect(r.velocity.z).toBeCloseTo(0, 9);
  });

  it('reducedMotion reproduces the instantaneous result', () => {
    const r = stepPlayer(input({ reducedMotion: true, targetLook: { yaw: 0, pitch: 0 }, keys: keys('forward', 'yawLeft'), mouseDelta: { x: 10, y: 5 } }));
    expect(r.look).toEqual(r.targetLook);
    expect(r.look.yaw).toBeGreaterThan(0);
    const stopped = stepPlayer(input({ reducedMotion: true, velocity: { x: 0, z: -WALK_SPEED } }));
    expect(stopped.velocity).toEqual({ x: 0, z: 0 });
    expect(stopped.pos).toEqual({ x: 0, z: 0 });
    const moved = stepPlayer(input({ reducedMotion: true, keys: keys('forward') }));
    expect(moved.pos.z).toBeCloseTo(-WALK_SPEED * 0.05, 9);
  });

  it('inspecting freezes immediately with zero velocity and the look on its target', () => {
    const r = stepPlayer(
      input({
        mode: 'inspecting',
        look: { yaw: 0.1, pitch: 0 },
        targetLook: { yaw: 0.5, pitch: 0.2 },
        velocity: { x: 1, z: 1 },
        keys: keys('forward'),
      }),
    );
    expect(r.velocity).toEqual({ x: 0, z: 0 });
    expect(r.look).toEqual({ yaw: 0.5, pitch: 0.2 });
    expect(r.pos).toEqual({ x: 0, z: 0 });
  });

  it('snap (cleared input) zeroes velocity and starts the look on the target', () => {
    const r = stepPlayer(input({ snap: true, look: { yaw: 0, pitch: 0 }, targetLook: { yaw: 0.5, pitch: 0 }, velocity: { x: 1, z: 1 } }));
    expect(r.velocity).toEqual({ x: 0, z: 0 });
    expect(r.look.yaw).toBeCloseTo(0.5, 12);
    expect(r.pos).toEqual({ x: 0, z: 0 });
  });

  it('keeps pitch clamped and yaw wrapped while smoothing', () => {
    const limit = (PITCH_LIMIT_DEG * Math.PI) / 180;
    let look = { yaw: 3, pitch: 0 };
    let targetLook = { yaw: 3, pitch: 0 };
    for (let k = 0; k < 200; k++) {
      const r = stepPlayer(input({ look, targetLook, keys: keys('yawLeft', 'pitchUp'), dt: 1 / 60 }));
      look = r.look;
      targetLook = r.targetLook;
      expect(Math.abs(look.pitch)).toBeLessThanOrEqual(limit + 1e-9);
      expect(Math.abs(look.yaw)).toBeLessThanOrEqual(Math.PI + 1e-9);
      expect(Number.isFinite(look.yaw)).toBe(true);
    }
    void L;
  });
});
