// Pure module: no imports from React, three.js or the DOM.
import type { Vec2 } from '../worldTypes';
import { clampDt } from './movement';

const TWO_PI = Math.PI * 2;

/**
 * Frame-rate-independent smoothing factor: 1 - exp(-lambda * clampDt(dt)).
 * Returns 0 for a non-positive or non-finite dt (or non-positive / NaN lambda), and 1 when lambda is Infinity.
 */
export function smoothingAlpha(lambda: number, dt: number): number {
  const d = clampDt(dt);
  if (d <= 0 || Number.isNaN(lambda) || lambda <= 0) return 0;
  if (lambda === Infinity) return 1;
  return 1 - Math.exp(-lambda * d);
}

/** current + (target - current) * alpha. A non-finite alpha leaves the value unchanged; alpha is clamped to 0..1. */
export function dampScalar(current: number, target: number, alpha: number): number {
  if (!Number.isFinite(alpha)) return current;
  const a = Math.min(1, Math.max(0, alpha));
  if (a === 1) return target;
  return current + (target - current) * a;
}

/** Smooths an angle toward a target along the shortest arc (across the +/-PI wrap). The result is in (-PI, PI]. */
export function dampAngle(current: number, target: number, alpha: number): number {
  if (!Number.isFinite(alpha)) return current;
  const a = Math.min(1, Math.max(0, alpha));
  if (a === 1) return target;
  let diff = (target - current) % TWO_PI;
  if (diff > Math.PI) diff -= TWO_PI;
  else if (diff < -Math.PI) diff += TWO_PI;
  const out = current + diff * a;
  // Wrap into (-PI, PI].
  let y = out % TWO_PI;
  if (y > Math.PI) y -= TWO_PI;
  else if (y <= -Math.PI) y += TWO_PI;
  return y;
}

/** Component-wise dampScalar for floor-plane vectors. */
export function dampVec2(current: Vec2, target: Vec2, alpha: number): Vec2 {
  return { x: dampScalar(current.x, target.x, alpha), z: dampScalar(current.z, target.z, alpha) };
}
