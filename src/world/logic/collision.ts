// Pure module: no imports from React, three.js or the DOM.
// Circle (Player) versus axis-aligned box (Collider) collision on the floor plane.

import type { Aabb, Vec2 } from '../worldTypes';
import { MAX_STEP } from './constants';

/** Penetration tolerance: a circle touching a box exactly is not overlapping. */
const EPS = 1e-9;
const RESOLVE_PASSES = 4;
const RELOCATE_GRID = 0.1;
const RELOCATE_MAX_RING = 50;

/**
 * If the circle (p, r) overlaps `box`, returns the nearest non-overlapping
 * point. Otherwise returns `p` unchanged. Touching exactly is not overlap.
 */
export function resolveCircleAabb(p: Vec2, r: number, box: Aabb): Vec2 {
  const cx = Math.min(Math.max(p.x, box.minX), box.maxX);
  const cz = Math.min(Math.max(p.z, box.minZ), box.maxZ);
  const dx = p.x - cx;
  const dz = p.z - cz;
  const d2 = dx * dx + dz * dz;

  if (d2 === 0) {
    // Centre inside (or on the edge of) the box: push out along the axis of least penetration.
    const toMinX = p.x - box.minX;
    const toMaxX = box.maxX - p.x;
    const toMinZ = p.z - box.minZ;
    const toMaxZ = box.maxZ - p.z;
    const m = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
    if (m === toMinX) return { x: box.minX - r, z: p.z };
    if (m === toMaxX) return { x: box.maxX + r, z: p.z };
    if (m === toMinZ) return { x: p.x, z: box.minZ - r };
    return { x: p.x, z: box.maxZ + r };
  }

  const limit = r - EPS;
  if (limit <= 0 || d2 >= limit * limit) return p;
  const d = Math.sqrt(d2);
  const k = r / d;
  return { x: cx + dx * k, z: cz + dz * k };
}

/** Resolves against every box, repeating a fixed number of passes (4) until stable. */
export function resolveAll(p: Vec2, r: number, boxes: readonly Aabb[]): Vec2 {
  let cur = p;
  for (let pass = 0; pass < RESOLVE_PASSES; pass++) {
    let changed = false;
    for (const box of boxes) {
      const next = resolveCircleAabb(cur, r, box);
      if (next !== cur) {
        cur = next;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return cur;
}

/** Keeps the whole circle inside `bounds`. */
export function clampToBounds(p: Vec2, r: number, bounds: Aabb): Vec2 {
  const x = clampAxis(p.x, bounds.minX + r, bounds.maxX - r);
  const z = clampAxis(p.z, bounds.minZ + r, bounds.maxZ - r);
  return x === p.x && z === p.z ? p : { x, z };
}

function clampAxis(v: number, lo: number, hi: number): number {
  if (lo > hi) return (lo + hi) / 2; // bounds smaller than the circle: centre it
  return Math.min(Math.max(v, lo), hi);
}

/**
 * Moves by `displacement` in substeps of at most MAX_STEP. Each substep moves X,
 * resolves, then moves Z and resolves, which gives wall sliding.
 */
export function moveWithCollision(
  pos: Vec2,
  displacement: Vec2,
  r: number,
  boxes: readonly Aabb[],
  bounds: Aabb,
): Vec2 {
  if (!Number.isFinite(displacement.x) || !Number.isFinite(displacement.z)) return pos;
  const len = Math.hypot(displacement.x, displacement.z);
  if (len === 0) return pos;
  const n = Math.max(1, Math.ceil(len / MAX_STEP));
  const sx = displacement.x / n;
  const sz = displacement.z / n;
  let cur = pos;
  for (let i = 0; i < n; i++) {
    cur = clampToBounds(resolveAll({ x: cur.x + sx, z: cur.z }, r, boxes), r, bounds);
    cur = clampToBounds(resolveAll({ x: cur.x, z: cur.z + sz }, r, boxes), r, bounds);
  }
  return cur;
}

/** True when the circle (p, r) overlaps any box (touching is not overlap). */
export function overlapsAny(p: Vec2, r: number, boxes: readonly Aabb[]): boolean {
  for (const box of boxes) {
    if (resolveCircleAabb(p, r, box) !== p) return true;
  }
  return false;
}

function isValid(p: Vec2, r: number, boxes: readonly Aabb[], bounds: Aabb): boolean {
  return (
    p.x >= bounds.minX + r - EPS &&
    p.x <= bounds.maxX - r + EPS &&
    p.z >= bounds.minZ + r - EPS &&
    p.z <= bounds.maxZ - r + EPS &&
    !overlapsAny(p, r, boxes)
  );
}

/**
 * Returns a valid position near `p`: resolve first; if still invalid, search a
 * 0.1 grid in growing square rings (nearest candidate per ring); else `fallback`.
 */
export function relocateToValid(
  p: Vec2,
  r: number,
  boxes: readonly Aabb[],
  bounds: Aabb,
  fallback: Vec2,
): Vec2 {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return fallback;
  const resolved = clampToBounds(resolveAll(p, r, boxes), r, bounds);
  if (isValid(resolved, r, boxes, bounds)) return resolved;

  for (let ring = 1; ring <= RELOCATE_MAX_RING; ring++) {
    let best: Vec2 | null = null;
    let bestD = Infinity;
    for (let i = -ring; i <= ring; i++) {
      for (let j = -ring; j <= ring; j++) {
        if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue;
        const c = { x: p.x + i * RELOCATE_GRID, z: p.z + j * RELOCATE_GRID };
        if (!isValid(c, r, boxes, bounds)) continue;
        const d = i * i + j * j;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
    }
    if (best) return best;
  }
  return fallback;
}
