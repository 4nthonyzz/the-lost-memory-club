// Pure module: no imports from React, three.js or the DOM.
// Targeting is 2D on the floor plane. Pitch is ignored. The module has no
// knowledge of lock state: it only reports which Station is targeted.

import type { StationId } from '../../core/contracts';
import type { Aabb, InteractableDef, InteractionTarget, StationDef, Vec2 } from '../worldTypes';
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
  return selectInteractionStation(pos, yaw, stations, colliders, range, coneDeg)?.id ?? null;
}

/**
 * Same selection as `selectInteractionTarget`, but returns the winning StationDef. Several entries may share
 * one StationId (three arcade cabinets), so this tells them apart. The nearest eligible entry wins and ties
 * go to the first entry in list order.
 */
export function selectInteractionStation(
  pos: Vec2,
  yaw: number,
  stations: readonly StationDef[],
  colliders: readonly Aabb[],
  range: number = INTERACTION_RANGE,
  coneDeg: number = INTERACTION_CONE_DEG,
): StationDef | null {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const cosCone = Math.cos((coneDeg * Math.PI) / 180);

  let best: StationDef | null = null;
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
      best = station;
    }
  }
  return best;
}

/**
 * Combined targeting: Stations (range INTERACTION_RANGE) and world-local props (each prop's own range, 2.2 m)
 * share the same view cone and line-of-sight rules. A target's own Collider is ignored for its own test; props
 * without a Collider are never occluded by themselves. The nearest eligible target wins. On equal distance the
 * earlier entry wins, and Stations come before props. Returns null when nothing qualifies.
 */
export function selectInteractionTargetAll(
  pos: Vec2,
  yaw: number,
  stations: readonly StationDef[],
  props: readonly InteractableDef[],
  colliders: readonly Aabb[],
  coneDeg: number = INTERACTION_CONE_DEG,
): InteractionTarget | null {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const cosCone = Math.cos((coneDeg * Math.PI) / 180);

  const distanceIfEligible = (anchor: Vec2, range: number, own: Aabb | undefined): number | null => {
    const dx = anchor.x - pos.x;
    const dz = anchor.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (!(dist <= range + EPS)) return null;
    if (dist > EPS) {
      const cosAngle = (fx * dx + fz * dz) / dist;
      if (cosAngle < cosCone - EPS) return null;
    }
    for (const box of colliders) {
      if (own && sameBox(box, own)) continue;
      if (segmentIntersectsAabb(pos, anchor, box)) return null;
    }
    return dist;
  };

  let best: InteractionTarget | null = null;
  let bestDist = Infinity;
  for (const station of stations) {
    const d = distanceIfEligible(station.anchor, INTERACTION_RANGE, station.collider);
    if (d !== null && d < bestDist) {
      bestDist = d;
      best = { type: 'station', station };
    }
  }
  for (const prop of props) {
    const d = distanceIfEligible(prop.anchor, prop.range, prop.collider);
    if (d !== null && d < bestDist) {
      bestDist = d;
      best = { type: 'prop', prop };
    }
  }
  return best;
}