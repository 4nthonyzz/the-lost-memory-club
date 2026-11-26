/**
 * Hidden box face culling (tasks 33.1 and 34.1). Pure data, no three.js.
 *
 * Floor-flush bottoms (33.1): the player camera is always above the floor, so the -Y face of a box that rests on the floor (its bottom at
 * y = 0) is never visible. Such box parts are flagged `openBottom`: the renderer builds them from a cached geometry without the -Y face
 * (10 triangles instead of 12) and the triangle accounting subtracts the two removed triangles. Nothing visible changes.
 *
 * Wall-flush faces (34.1): a face of a box that lies exactly on a wall plane (within 1 mm), inside the wall's extent and its y range, points
 * into that opaque wall. The player is confined inside the room, so the camera is always on the other side of the face plane (the GPU would
 * back-face cull it) and the wall covers it anyway. Such parts carry `culledFaces` (BoxGeometry face indices) and the renderer builds
 * them from a cached geometry without those faces (`culledBoxGeometry` in sharedResources.ts). Only faces within 1 mm of a wall are removed.
 */
import type { Aabb, Facing } from '../worldTypes'
import type { Part } from './modelDetail'

/** A box counts as floor-flush when its bottom is within this distance of y = 0 (1 mm). */
export const FLOOR_FLUSH_TOLERANCE = 0.001
/** Triangles removed by dropping the -Y face of a box (and, generally, any one face of a box). */
export const OPEN_BOTTOM_SAVED_TRIANGLES = 2
export const CULLED_FACE_SAVED_TRIANGLES = 2
/** A face counts as wall-flush when its plane is within this distance of the wall plane (1 mm). */
export const WALL_FLUSH_TOLERANCE = 0.001

/** BoxGeometry face indices: +x, -x, +y, -y, +z, -z. */
export const BOX_FACES = Object.freeze({ px: 0, nx: 1, py: 2, ny: 3, pz: 4, nz: 5 })

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

/** Every removed face index of a part, sorted and without duplicates: the open bottom (-Y) plus the wall-flush faces. */
export function removedFaces(p: Part): readonly number[] {
  const set = new Set<number>(p.culledFaces ?? [])
  if (p.openBottom) set.add(BOX_FACES.ny)
  return [...set].sort((a, b) => a - b)
}

/** Key of a set of removed faces, for caches and draw-call groups ('' for none). */
export const removedFacesKey = (p: Part): string => removedFaces(p).join('.')

/** Axis-aligned world extent of an unrotated box part, or null for any other part (rotated, or not a box). */
function boxExtent(p: Part): { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number } | null {
  if (p.geo !== 'box') return null
  if (p.rot && (Math.abs(p.rot[0]) > 1e-9 || Math.abs(p.rot[1]) > 1e-9 || Math.abs(p.rot[2]) > 1e-9)) return null
  return {
    minX: p.pos[0] - p.scale[0] / 2,
    maxX: p.pos[0] + p.scale[0] / 2,
    minY: p.pos[1] - p.scale[1] / 2,
    maxY: p.pos[1] + p.scale[1] / 2,
    minZ: p.pos[2] - p.scale[2] / 2,
    maxZ: p.pos[2] + p.scale[2] / 2,
  }
}

/**
 * Face indices of a world-frame box part that lie flat against a wall (see the file header). `walls` are the wall Colliders, `height` the room
 * height. A face is wall-flush when its plane is within 1 mm of the room-facing plane of a wall, and the face (its extent along the wall and
 * its y range) lies inside that wall.
 */
export function wallFlushFaces(p: Part, walls: readonly Aabb[], height: number): number[] {
  const e = boxExtent(p)
  if (!e) return []
  const tol = WALL_FLUSH_TOLERANCE
  if (e.minY < -tol || e.maxY > height + tol) return []
  const out = new Set<number>()
  for (const w of walls) {
    const withinX = e.minX >= w.minX - tol && e.maxX <= w.maxX + tol
    const withinZ = e.minZ >= w.minZ - tol && e.maxZ <= w.maxZ + tol
    if (withinX && Math.abs(e.minZ - w.maxZ) <= tol) out.add(BOX_FACES.nz) // wall on the -z side, face looks into it
    if (withinX && Math.abs(e.maxZ - w.minZ) <= tol) out.add(BOX_FACES.pz) // wall on the +z side
    if (withinZ && Math.abs(e.minX - w.maxX) <= tol) out.add(BOX_FACES.nx)
    if (withinZ && Math.abs(e.maxX - w.minX) <= tol) out.add(BOX_FACES.px)
  }
  return [...out].sort((a, b) => a - b)
}

/** Flags the wall-flush faces of every world-frame box of `parts` as `culledFaces`. Other parts are returned unchanged (same objects). */
export function cullWallFlush(parts: readonly Part[], walls: readonly Aabb[], height: number): Part[] {
  return parts.map((p) => {
    const faces = wallFlushFaces(p, walls, height).filter((f) => !(p.culledFaces ?? []).includes(f))
    return faces.length ? { ...p, culledFaces: [...(p.culledFaces ?? []), ...faces].sort((a, b) => a - b) } : p
  })
}

/**
 * True when the back of a prop footprint (the side opposite its front, `facing` defaults to '+z') lies exactly on a wall plane (within 1 mm)
 * and inside that wall's extent. Parts built in the prop's local frame (front toward +z) then drop their local back (-z) face.
 */
export function backAgainstWall(box: Aabb, facing: Facing | undefined, walls: readonly Aabb[]): boolean {
  const tol = WALL_FLUSH_TOLERANCE
  return walls.some((w) => {
    const withinX = box.minX >= w.minX - tol && box.maxX <= w.maxX + tol
    const withinZ = box.minZ >= w.minZ - tol && box.maxZ <= w.maxZ + tol
    switch (facing ?? '+z') {
      case '+z':
        return withinX && Math.abs(box.minZ - w.maxZ) <= tol
      case '-z':
        return withinX && Math.abs(box.maxZ - w.minZ) <= tol
      case '+x':
        return withinZ && Math.abs(box.minX - w.maxX) <= tol
      case '-x':
        return withinZ && Math.abs(box.maxX - w.minX) <= tol
    }
  })
}

/**
 * Flags the local back (-Z) face of every unrotated local-frame box whose back lies at `backZ` (the prop's local minZ, within 1 mm). Used by
 * builders whose parts are in a prop-local frame (front toward +z) when `backAgainstWall` is true for the prop.
 */
export function cullLocalBack(parts: readonly Part[], backZ: number): Part[] {
  return parts.map((p) => {
    const e = boxExtent(p)
    if (!e || Math.abs(e.minZ - backZ) > WALL_FLUSH_TOLERANCE || (p.culledFaces ?? []).includes(BOX_FACES.nz)) return p
    return { ...p, culledFaces: [...(p.culledFaces ?? []), BOX_FACES.nz].sort((a, b) => a - b) }
  })
}
