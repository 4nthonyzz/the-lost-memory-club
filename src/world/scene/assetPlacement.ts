/**
 * Pure placement of an optional GLB from a layout footprint (task 13.2).
 *
 * GLB authoring convention (documented for tools/blender):
 * - Units are metres, +Y is up, the model origin is the centre of its footprint at floor level (y = 0).
 * - The model's front faces +Z. It is authored at 1:1 scale of the layout footprint, so scale is 1.
 * - Elongated models (shelves) are authored with their long side along X.
 *
 * Orientation without a `facing`: when the footprint is longer in Z than in X, the model is rotated
 * 90 degrees about Y so its long side follows Z (west-wall shelves 'shelf-a'/'shelf-b'). Square
 * footprints and footprints longer in X are not rotated.
 *
 * Orientation with a `facing` (task 15.6): the model's +Z front is rotated to point toward the
 * facing direction ('-x' for the arcade cabinet in the Arcade_Area). The footprint rule above is
 * not applied; the layout footprint already has the rotated width and depth, and `facingFrame()`
 * gives the same footprint in the model's own (unrotated) frame for primitives.
 *
 * This only decides where decoration is drawn. Colliders and interaction anchors come from the layout
 * and never from GLB geometry.
 */
import type { Aabb, Facing } from '../worldTypes'

export type Vec3 = [number, number, number]

export interface AssetPlacement {
  position: Vec3
  rotation: Vec3
  scale: Vec3
}

/** Y rotation that turns a model front (+Z) toward `facing`. */
export function facingYaw(facing: Facing = '+z'): number {
  switch (facing) {
    case '+z':
      return 0
    case '-z':
      return Math.PI
    case '+x':
      return Math.PI / 2
    case '-x':
      return -Math.PI / 2
  }
}

export function assetPlacement(box: Aabb, facing?: Facing): AssetPlacement {
  const w = box.maxX - box.minX
  const d = box.maxZ - box.minZ
  return {
    position: [(box.minX + box.maxX) / 2, 0, (box.minZ + box.maxZ) / 2],
    rotation: [0, facing ? facingYaw(facing) : d > w ? Math.PI / 2 : 0, 0],
    scale: [1, 1, 1],
  }
}

export interface FacingFrame {
  /** World position of the footprint centre at floor level. */
  position: Vec3
  /** Y rotation of the group that holds the local parts. */
  rotationY: number
  /** Footprint in the unrotated local frame: centred on the origin, front at local +Z (maxZ). */
  local: Aabb
}

/**
 * Splits a world footprint into a group transform and a local footprint whose front faces +Z.
 * Parts built against `local` and placed in a group at `position` with `rotationY` end up with
 * their front toward `facing` and exactly over the world footprint.
 */
export function facingFrame(box: Aabb, facing: Facing = '+z'): FacingFrame {
  const worldW = box.maxX - box.minX
  const worldD = box.maxZ - box.minZ
  const sideways = facing === '+x' || facing === '-x'
  const w = sideways ? worldD : worldW
  const d = sideways ? worldW : worldD
  return {
    position: [(box.minX + box.maxX) / 2, 0, (box.minZ + box.maxZ) / 2],
    rotationY: facingYaw(facing),
    local: { minX: -w / 2, maxX: w / 2, minZ: -d / 2, maxZ: d / 2 },
  }
}
