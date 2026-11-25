// Pure module: no imports from React, three.js or the DOM.
import type { Aabb, Vec2 } from '../worldTypes';
import { moveWithCollision } from './collision';
import { LOOK_SMOOTHING_LAMBDA, MOVE_SMOOTHING_LAMBDA, PLAYER_RADIUS, WALK_SPEED } from './constants';
import type { InputMode } from './inputMode';
import type { HeldKeys } from './inputState';
import { toLookKeys, toMovementInput } from './inputState';
import { applyKeyboardLook, applyMouseLook, type Look } from './look';
import { clampDt, inputVector, stepMovement } from './movement';
import { dampAngle, dampScalar, dampVec2, smoothingAlpha } from './smoothing';

export interface PlayerStepInput {
  pos: Vec2;
  /** RENDERED look (what the camera shows and what movement and targeting use). */
  look: Look;
  /** TARGET look (after mouse and keyboard input). Defaults to `look` when absent. */
  targetLook?: Look;
  /** Current velocity in world units per second. Defaults to zero. */
  velocity?: Vec2;
  /** True: no smoothing (alpha 1), identical to the pre-smoothing behaviour. */
  reducedMotion?: boolean;
  /** True on the frame after input was cleared (CLEAR_INPUT / blur): velocity starts at 0 and the rendered look starts at the target. */
  snap?: boolean;
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
  /** Rendered look. */
  look: Look;
  /** Target look. */
  targetLook: Look;
  velocity: Vec2;
}

const ZERO: Vec2 = { x: 0, z: 0 };
/** A velocity component is zeroed when collision removed more than this much of the intended displacement. */
const BLOCKED_EPSILON = 1e-6;

/**
 * One frame of look and movement with exponential smoothing.
 * - 'inspecting': frozen. Velocity is 0 and the rendered look snaps to the target.
 * - Snap rule: 'inspecting' and a cleared input (snap flag: blur, CLEAR_INPUT, suspension) zero the velocity and\n *   put the rendered look on the target, so nothing glides or drifts. A normal key release decays velocity.\n * - Reduced motion: alpha is 1, identical to the pre-smoothing instantaneous behaviour.\n * - Otherwise the target look takes mouse and keyboard input, the rendered look approaches it
 *   (yaw along the shortest arc), the velocity approaches inputVector(rendered yaw) * WALK_SPEED,
 *   and velocity * dt goes through moveWithCollision. A blocked axis zeroes that velocity component.
 */
export function stepPlayer(i: PlayerStepInput): PlayerStepResult {
  const startTarget = i.targetLook ?? i.look;
  const startLook = i.snap ? startTarget : i.look;
  const startVelocity = i.snap ? ZERO : (i.velocity ?? ZERO);
  if (i.mode === 'inspecting') {
    return { pos: i.pos, look: startTarget, targetLook: startTarget, velocity: ZERO };
  }

  const dt = clampDt(i.dt);
  const reduced = i.reducedMotion === true;
  let target = startTarget;

  if (i.mouseDelta.x !== 0 || i.mouseDelta.y !== 0) {
    target = applyMouseLook(target, i.mouseDelta.x, i.mouseDelta.y);
  }

  const lk = toLookKeys(i.keys);
  if (dt > 0 && (lk.yawLeft || lk.yawRight || lk.pitchUp || lk.pitchDown)) {
    target = applyKeyboardLook(target, lk, dt);
  }

  const lookAlpha = reduced ? 1 : smoothingAlpha(LOOK_SMOOTHING_LAMBDA, dt);
  const look: Look = reduced
    ? target
    : { yaw: dampAngle(startLook.yaw, target.yaw, lookAlpha), pitch: dampScalar(startLook.pitch, target.pitch, lookAlpha) };

  const input = toMovementInput(i.keys);
  const moving = input.forward || input.backward || input.left || input.right;
  const targetVelocity = moving ? scale(inputVector(input, look.yaw), WALK_SPEED) : ZERO;
  const moveAlpha = reduced ? 1 : smoothingAlpha(MOVE_SMOOTHING_LAMBDA, dt);
  let velocity = reduced ? targetVelocity : dampVec2(startVelocity, targetVelocity, moveAlpha);
  // Settle tiny residual velocity so the player comes to a true stop.
  if (!reduced && !moving && Math.hypot(velocity.x, velocity.z) < 1e-4) velocity = ZERO;

  let pos = i.pos;
  if (dt > 0 && (velocity.x !== 0 || velocity.z !== 0)) {
    let displacement: Vec2;
    if (reduced) {
      const next = stepMovement(pos, look.yaw, input, dt);
      displacement = { x: next.x - pos.x, z: next.z - pos.z };
    } else {
      displacement = { x: velocity.x * dt, z: velocity.z * dt };
    }
    pos = moveWithCollision(pos, displacement, i.radius ?? PLAYER_RADIUS, i.colliders, i.bounds);
    const dx = pos.x - i.pos.x;
    const dz = pos.z - i.pos.z;
    if (Math.abs(displacement.x - dx) > BLOCKED_EPSILON) velocity = { x: 0, z: velocity.z };
    if (Math.abs(displacement.z - dz) > BLOCKED_EPSILON) velocity = { x: velocity.x, z: 0 };
  }

  return { pos, look, targetLook: target, velocity };
}

function scale(v: Vec2, k: number): Vec2 {
  return { x: v.x * k, z: v.z * k };
}
