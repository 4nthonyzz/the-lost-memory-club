import type { StationId } from '../core/contracts';

/** Point or vector on the floor plane (x, z). Right-handed, y is up, 1 unit = 1 metre. */
export interface Vec2 {
  x: number;
  z: number;
}

/** Axis-aligned box on the floor plane, used for Colliders and room bounds. */
export interface Aabb {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface MovementInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

export interface StationDef {
  id: StationId;
  /** Point on the Station front face used for distance and cone tests. */
  anchor: Vec2;
  /** The Station's own Collider. */
  collider: Aabb;
}
