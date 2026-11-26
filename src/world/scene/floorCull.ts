/**
 * Floor-flush bottom face culling (task 33.1). Pure data, no three.js.
 *
 * The player camera is always above the floor, so the -Y face of a box that rests on the floor (its bottom at y = 0) is never
 * visible. Such box parts are flagged `openBottom`: the renderer builds them from a cached geometry without the -Y face (10 triangles
 * instead of 12) and the triangle accounting subtracts the two removed triangles. Nothing visible changes.
 */
import type { Part } from './modelDetail'

/** A box counts as floor-flush when its bottom is within this distance of y = 0 (1 mm). */
export const FLOOR_FLUSH_TOLERANCE = 0.001
/** Triangles removed by dropping the -Y face of a box. */
export const OPEN_BOTTOM_SAVED_TRIANGLES = 2

/** True for an unrotated (or only yaw-rotated) `box` part whose bottom face lies on the floor. */
export function isFloorFlushBox(p: Part): boolean {
  if (p.geo !== 'box') return false
  if (p.rot && (Math.abs(p.rot[0]) > 1e-9 || Math.abs(p.rot[2]) > 1e-9)) return false
  return Math.abs(p.pos[1] - p.scale[1] / 2) <= FLOOR_FLUSH_TOLERANCE
}

/** Flags every floor-flush box of `parts` as `openBottom`. Other parts are returned unchanged (same objects). */
export function cullFloorBottoms(parts: readonly Part[]): Part[] {
  return parts.map((p) => (isFloorFlushBox(p) && !p.openBottom ? { ...p, openBottom: true } : p))
}
