// Pure module: no imports from React, three.js or the DOM.
import { KEY_LOOK_DEG_PER_SEC, MOUSE_DELTA_MAX, MOUSE_SENSITIVITY, PITCH_LIMIT_DEG } from './constants';
import { clampDt } from './movement';

export interface Look {
  yaw: number;
  pitch: number;
}

const PITCH_LIMIT_RAD = (PITCH_LIMIT_DEG * Math.PI) / 180;
const TWO_PI = Math.PI * 2;

/** Clamp pitch to +/- PITCH_LIMIT_DEG (in radians). NaN gives 0. */
export function clampPitch(pitch: number): number {
  if (Number.isNaN(pitch)) return 0;
  return Math.min(PITCH_LIMIT_RAD, Math.max(-PITCH_LIMIT_RAD, pitch));
}

/** Wrap yaw into (-PI, PI]. Non-finite gives 0. */
export function wrapYaw(yaw: number): number {
  if (!Number.isFinite(yaw)) return 0;
  if (yaw > -Math.PI && yaw <= Math.PI) return yaw;
  let y = yaw % TWO_PI; // in (-2PI, 2PI)
  if (y > Math.PI) y -= TWO_PI;
  else if (y <= -Math.PI) y += TWO_PI;
  return y;
}

function validDelta(d: number): boolean {
  return Number.isFinite(d) && Math.abs(d) <= MOUSE_DELTA_MAX;
}

/** Apply a mouse movement. An axis with a non-finite or oversized delta is ignored. */
export function applyMouseLook(
  look: Look,
  dx: number,
  dy: number,
  sensitivity: number = MOUSE_SENSITIVITY,
): Look {
  const s = Number.isFinite(sensitivity) ? sensitivity : MOUSE_SENSITIVITY;
  const yaw = validDelta(dx) ? look.yaw - dx * s : look.yaw;
  const pitch = validDelta(dy) ? look.pitch - dy * s : look.pitch;
  return { yaw: wrapYaw(yaw), pitch: clampPitch(pitch) };
}

/** Held keyboard look keys: J yawLeft, L yawRight, I pitchUp, K pitchDown. */
export interface LookKeys {
  yawLeft: boolean;
  yawRight: boolean;
  pitchUp: boolean;
  pitchDown: boolean;
}

/**
 * Rotate by degPerSec * clampDt(dt). Yaw increases turning left (J), pitch increases
 * looking up (I). Opposing keys cancel. A non-finite or non-positive dt rotates nothing.
 */
export function applyKeyboardLook(
  look: Look,
  keys: LookKeys,
  dt: number,
  degPerSec: number = KEY_LOOK_DEG_PER_SEC,
): Look {
  const speed = Number.isFinite(degPerSec) ? degPerSec : KEY_LOOK_DEG_PER_SEC;
  const step = ((speed * Math.PI) / 180) * clampDt(dt);
  const yawDir = (keys.yawLeft ? 1 : 0) - (keys.yawRight ? 1 : 0);
  const pitchDir = (keys.pitchUp ? 1 : 0) - (keys.pitchDown ? 1 : 0);
  return {
    yaw: wrapYaw(look.yaw + yawDir * step),
    pitch: clampPitch(look.pitch + pitchDir * step),
  };
}