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

/** Ids of the world-only interactable props. They never use StationId and never reach onInspect. */
export type LampId = 'desk-lamp-left' | 'desk-lamp-right';
export type ManualId = 'manual-snake' | 'manual-maze' | 'manual-frequency';
/** Readable world props that are not manuals: the desk notebook, the cork board and the Memory_Shift poster. */
export type NoteId = 'desk-notebook' | 'cork-board' | 'poster-shift';
/** Props that open the Archive Document Card (six in total). */
export type ReadableId = ManualId | NoteId;
export type PropInteractableId = LampId | ReadableId;

/** A world-local interactable prop (a lamp, an arcade manual book or another readable note). Layout data only. */
export interface InteractableDef {
  id: PropInteractableId;
  kind: 'lamp' | 'manual' | 'note';
  /** Point used for distance and cone tests. */
  anchor: Vec2;
  /**
   * The footprint of the object this prop sits on or in (desk or bookcase). It is excluded from the
   * line-of-sight test for this prop only, so a prop on a solid object stays targetable. Optional.
   */
  collider?: Aabb;
  /** Maximum player-to-anchor distance, in metres. */
  range: number;
  /** Height of the interaction point above the floor, in metres. Informational. */
  height?: number;
  /**
   * True when the prop exists only while the Memory_Shift look is on (the overlay poster is invisible at t = 0).
   * Targeting excludes it unless the caller reports memoryShifted.
   */
  requiresShift?: boolean;
}

/** Combined result of world targeting: a Station or a world-local prop. */
export type InteractionTarget =
  | { type: 'station'; station: StationDef }
  | { type: 'prop'; prop: InteractableDef };
