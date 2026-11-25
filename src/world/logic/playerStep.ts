// Pure module: no imports from React, three.js or the DOM.
import type { Aabb, Vec2 } from '../worldTypes';
import { moveWithCollision } from './collision';
import { PLAYER_RADIUS } from './constants';
import type { InputMode } from './inputMode';
import type { HeldKeys } from './inputState';
import { toLookKeys, toMovementInput } from './inputState';
import { applyKeyboardLook, applyMouseLook, type Look } from './look';
import { clampDt, stepMovement } from './movement';

export interface PlayerStepInput {
  pos: Vec2;
  look: Look;
  keys: HeldKeys;
  mouseDelta: { x: number; y: number };
  dt: number;
  mode: InputMode;
  colliders: readonly Aabb[];
  bounds: Aabb;
  radius?: number;
}

export interface PlayerStepResult {
  pos: Vec2;
  look: Look;
}

/**
 * One frame of look and movement. In 'inspecting' nothing changes. Otherwise mouse
 * look and keyboard look (I/J/K/L) both apply, then movement uses the new yaw.
 */
export function stepPlayer(i: PlayerStepInput): PlayerStepResult {
  if (i.mode === 'inspecting') return { pos: i.pos, look: i.look };

  const dt = clampDt(i.dt);
  let look = i.look;

  if (i.mouseDelta.x !== 0 || i.mouseDelta.y !== 0) {
    look = applyMouseLook(look, i.mouseDelta.x, i.mouseDelta.y);
  }

  const lk = toLookKeys(i.keys);
  if (dt > 0 && (lk.yawLeft || lk.yawRight || lk.pitchUp || lk.pitchDown)) {
    look = applyKeyboardLook(look, lk, dt);
  }

  let pos = i.pos;
  const input = toMovementInput(i.keys);
  if (dt > 0 && (input.forward || input.backward || input.left || input.right)) {
    const next = stepMovement(pos, look.yaw, input, dt);
    const displacement = { x: next.x - pos.x, z: next.z - pos.z };
    pos = moveWithCollision(pos, displacement, i.radius ?? PLAYER_RADIUS, i.colliders, i.bounds);
  }

  return { pos, look };
}
