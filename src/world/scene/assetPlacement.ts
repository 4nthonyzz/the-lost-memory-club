/**
 * Pure placement of an optional GLB from a layout footprint (task 13.2).
 *
 * GLB authoring convention (documented for tools/blender):
 * - Units are metres, +Y is up, the model origin is the centre of its footprint at floor level (y = 0).
 * - The model's front faces +Z. It is authored at 1:1 scale of the layout footprint, so scale is 1.
 * - Elongated models (shelves) are authored with their long side along X.
 *
 * Orientation is derived from the footprint: when the footprint is longer in Z than in X, the model
 * is rotated 90 degrees about Y so its long side follows Z (west-wall shelves 'shelf-a'/'shelf-b').
 * Square footprints and footprints longer in X are not rotated.
 *
 * This only decides where decoration is drawn. Colliders and interaction anchors come from the layout
 * and never from GLB geometry.
 */
import type { Aabb } from '../worldTypes'

export type Vec3 = [number, number, number]

export interface AssetPlacement {
  position: Vec3
  rotation: Vec3
  scale: Vec3
}

export function assetPlacement(box: Aabb): AssetPlacement {
  const w = box.maxX - box.minX
  const d = box.maxZ - box.minZ
  return {
    position: [(box.minX + box.maxX) / 2, 0, (box.minZ + box.maxZ) / 2],
    rotation: [0, d > w ? Math.PI / 2 : 0, 0],
    scale: [1, 1, 1],
  }
}
