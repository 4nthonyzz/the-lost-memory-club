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

/** Direction a prop or Station front face points toward. Omitted means '+z'. */
export type Facing = '+z' | '-z' | '+x' | '-x';

/**
 * Which arcade game a cabinet is themed for. Layout and world data only: every cabinet still reports
 * the single `'arcade'` StationId, so the world never learns which game the App opens.
 */
export type ArcadeGameKind = 'snake' | 'maze' | 'frequency';

export interface StationDef {
  id: StationId;
  /** Optional game theme of an arcade cabinet. Several StationDefs may share the id 'arcade'. */
  arcadeGame?: ArcadeGameKind;
  /** Optional human-readable cabinet name, for example 'SNAKE.EXE - The Hungry Tape'. */
  label?: string;
  /** Point on the Station front face used for distance and cone tests. */
  anchor: Vec2;
  /** The Station's own Collider. */
  collider: Aabb;
  /** Direction the front face (and the anchor) points toward. Omitted means '+z'. */
  facing?: Facing;
}
