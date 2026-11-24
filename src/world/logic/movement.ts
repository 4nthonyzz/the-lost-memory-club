// Pure module: no imports from React, three.js or the DOM.
import type { MovementInput, Vec2 } from '../worldTypes';
import { DT_MAX, WALK_SPEED } from './constants';

/** Clamp a frame time: NaN or negative -> 0, above DT_MAX -> DT_MAX. */
export function clampDt(dt: number): number {
  if (!Number.isFinite(dt) || dt <= 0) return 0;
  return dt > DT_MAX ? DT_MAX : dt;
}

/**
 * World-space floor-plane direction for the held movement keys.
 * Opposing keys cancel. The result has length 0 or 1 (diagonals normalized).
 * forward = (-sin yaw, -cos yaw), right = (cos yaw, -sin yaw).
 */
export function inputVector(input: MovementInput, yaw: number): Vec2 {
  const fwd = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
  const side = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (fwd === 0 && side === 0) return { x: 0, z: 0 };
  const len = Math.hypot(fwd, side);
  const f = fwd / len;
  const s = side / len;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  return {
    x: f * -sin + s * cos,
    z: f * -cos + s * -sin,
  };
}

/** pos + inputVector * speed * clampDt(dt). No collision. */
export function stepMovement(
  pos: Vec2,
  yaw: number,
  input: MovementInput,
  dt: number,
  speed: number = WALK_SPEED,
): Vec2 {
  const v = inputVector(input, yaw);
  const k = speed * clampDt(dt);
  return { x: pos.x + v.x * k, z: pos.z + v.z * k };
}
