// Pure module: no imports from React, three.js or the DOM.
// Targeting is 2D on the floor plane. Pitch is ignored. The module has no
// knowledge of lock state: it only reports which Station is targeted.

import type { StationId } from '../../core/contracts';
import type { Aabb, StationDef, Vec2 } from '../worldTypes';
import { INTERACTION_CONE_DEG, INTERACTION_RANGE } from './constants';

/** Tolerance so values exactly on a boundary stay eligible despite float error. */
const EPS = 1e-9;

function sameBox(a: Aabb, b: Aabb): boolean {
  return a === b || (a.minX === b.minX && a.maxX === b.maxX && a.minZ === b.minZ && a.maxZ === b.maxZ);
}

/**
 * Segment vs axis-aligned box intersection (slab method). The box is closed:
 * touching its boundary counts as an intersection.
 */
export function segmentIntersectsAabb(a: Vec2, b: Vec2, box: Aabb): boolean {
  let tMin = 0;
  let tMax = 1;

  const axes: Array<[number, number, number, number]> = [
    [a.x, b.x - a.x, box.minX, box.maxX],
    [a.z, b.z - a.z, box.minZ, box.maxZ],
  ];

  for (const [origin, delta, lo, hi] of axes) {
    if (delta === 0) {
      if (origin < lo || origin > hi) return false;
      continue;
    }
    let t1 = (lo - origin) / delta;
    let t2 = (hi - origin) / delta;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    if (t1 > tMin) tMin = t1;
    if (t2 < tMax) tMax = t2;
    if (tMin > tMax) return false;
  }
  return true;
}

/**
 * Returns the id of the nearest Station that is within range, inside the view
 * cone, and not occluded by a Collider (the Station's own Collider is ignored
 * for its own test). Ties on distance go to the first Station in list order.
 * Returns null when no Station qualifies.
 */
export function selectInteractionTarget(
  pos: Vec2,
  yaw: number,
  stations: readonly StationDef[],
  colliders: readonly Aabb[],
  range: number = INTERACTION_RANGE,
  coneDeg: number = INTERACTION_CONE_DEG,
): StationId | null {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const cosCone = Math.cos((coneDeg * Math.PI) / 180);

  let best: StationId | null = null;
  let bestDist = Infinity;

  for (const station of stations) {
    const dx = station.anchor.x - pos.x;
    const dz = station.anchor.z - pos.z;
    const dist = Math.hypot(dx, dz);

    if (!(dist <= range + EPS)) continue;

    // A Station at (almost) the player's position counts as inside the cone.
    if (dist > EPS) {
      const cosAngle = (fx * dx + fz * dz) / dist;
      if (cosAngle < cosCone - EPS) continue;
    }

    let blocked = false;
    for (const box of colliders) {
      if (sameBox(box, station.collider)) continue;
      if (segmentIntersectsAabb(pos, station.anchor, box)) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    if (dist < bestDist) {
      bestDist = dist;
      best = station.id;
    }
  }
  return best;
}
