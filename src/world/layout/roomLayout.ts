/**
 * Milestone 1 room layout. Single source of truth for bounds, Colliders,
 * Station anchors and props. Pure data: no three.js, React or DOM imports.
 * Nothing here depends on `memoryShifted`.
 *
 * Axes: y up, yaw 0 looks toward -z. The player starts at the south side
 * (z = +3) and looks north, so Stations stand against the north wall and
 * face +z.
 */
import { PLAYER_RADIUS } from '../logic/constants';
import { overlapsAny } from '../logic/collision';
import type { Aabb, StationDef, Vec2 } from '../worldTypes';

export interface PropDef {
  id: string;
  kind: 'desk' | 'shelf' | 'station' | 'furniture' | 'detail';
  /** Footprint on the floor plane. Doubles as the Collider when `solid`. */
  box: Aabb;
  /** Height of the box in metres (render hint only). */
  height: number;
  /** Milestone that introduced the prop (1 = M1 room, 3 = full archive). */
  milestone: number;
  /** Whether the footprint is a Collider. Posters, cables and small items are not. */
  solid: boolean;
  /** Optional GLB asset path, used by the M5 asset integration. */
  glbPath?: string;
}

export interface DoorDef {
  id: string;
  /** Walkable passage. Never a Collider. */
  opening: Aabb;
  /** Frame-side Colliders on both sides of the opening. */
  frames: readonly Aabb[];
  milestone: number;
  glbPath?: string;
}

function box(minX: number, maxX: number, minZ: number, maxZ: number): Aabb {
  return Object.freeze({ minX, maxX, minZ, maxZ });
}

function prop(
  id: string,
  kind: PropDef['kind'],
  b: Aabb,
  height: number,
  milestone = 1,
  solid = true,
  glbPath?: string,
): PropDef {
  return Object.freeze({ id, kind, box: b, height, milestone, solid, ...(glbPath ? { glbPath } : {}) });
}

/** Main room x -5..5, z -4..4. Arcade_Area x 5.3..9.3, z -2..2, entered from the east wall. */
const BOUNDS: Aabb = box(-5, 9.3, -4, 4);
const WALL_THICKNESS = 0.3;

/** Frame jamb width on each side of a door opening. */
const JAMB = 0.15;

function door(id: string, z0: number, z1: number): DoorDef {
  return Object.freeze({
    id,
    opening: box(5 - 0.15, 5.3 + 0.15, z0, z1),
    frames: Object.freeze([box(4.85, 5.45, z0 - JAMB, z0), box(4.85, 5.45, z1, z1 + JAMB)]),
    milestone: 3,
  });
}

const DOORS: readonly DoorDef[] = Object.freeze([door('door-east-north', -1.8, -0.6), door('door-east-south', 0.6, 1.8)]);

/** Wall Colliders: main room, east wall segments between the doors, Arcade_Area walls. */
const WALLS: readonly Aabb[] = Object.freeze([
  box(-5 - WALL_THICKNESS, 5 + WALL_THICKNESS, -4 - WALL_THICKNESS, -4), // north
  box(-5 - WALL_THICKNESS, 5 + WALL_THICKNESS, 4, 4 + WALL_THICKNESS), // south
  box(-5 - WALL_THICKNESS, -5, -4, 4), // west
  box(5, 5.3, -4, -1.95), // east, north of door 1
  box(5, 5.3, -0.45, 0.45), // east, pillar between the doors
  box(5, 5.3, 1.95, 4), // east, south of door 2
  box(5.3, 9.6, -2.3, -2), // Arcade_Area north
  box(5.3, 9.6, 2, 2.3), // Arcade_Area south
  box(9.3, 9.6, -2, 2), // Arcade_Area east
]);

const DESK = prop('reception-desk', 'desk', box(-1.5, 1.5, 0.5, 1.3), 1.0);
const SHELF_A = prop('shelf-a', 'shelf', box(-5, -4.6, -2.6, -0.4), 2.2);
const SHELF_B = prop('shelf-b', 'shelf', box(-5, -4.6, 0.4, 2.6), 2.2);
const SHELF_C = prop('shelf-c', 'shelf', box(2, 4, 3.4, 4), 2.2, 3);

/** CRT television on a stand against the north wall; front face at z = -3.4. */
const VHS_PROP = prop('crt-vhs', 'station', box(-3, -2, -4, -3.4), 1.2);
/** Arcade cabinet against the north wall; front face at z = -3.2. */
const ARCADE_PROP = prop('arcade-cabinet', 'station', box(2, 3, -4, -3.2), 1.8);

const CHAIR = prop('abandoned-chair', 'furniture', box(2.9, 3.5, 1.9, 2.5), 0.9, 3);
const COUCH = prop('couch', 'furniture', box(-3.9, -2.1, 2.6, 3.4), 0.9, 3);

const DETAILS: readonly PropDef[] = Object.freeze([
  prop('crate-a', 'detail', box(8.3, 8.9, -1.8, -1.2), 0.6, 3),
  prop('crate-b', 'detail', box(8.3, 8.9, 1.2, 1.8), 0.5, 3),
  prop('tape-stack', 'detail', box(-0.6, -0.2, 0.7, 1.1), 0.15, 3, false),
  prop('poster-north', 'detail', box(0.5, 1.5, -4, -3.95), 1.0, 3, false),
  prop('poster-arcade-area', 'detail', box(7, 8, -2, -1.95), 1.0, 3, false),
  prop('cable-run', 'detail', box(-1, 1, -2.5, -2.45), 0.02, 3, false),
]);

const STATIONS: readonly StationDef[] = Object.freeze([
  Object.freeze({
    id: 'vhs' as const,
    anchor: Object.freeze({ x: -2.5, z: VHS_PROP.box.maxZ }),
    collider: VHS_PROP.box,
  }),
  Object.freeze({
    id: 'arcade' as const,
    anchor: Object.freeze({ x: 2.5, z: ARCADE_PROP.box.maxZ }),
    collider: ARCADE_PROP.box,
  }),
]);

const PROPS: readonly PropDef[] = Object.freeze([
  DESK,
  SHELF_A,
  SHELF_B,
  SHELF_C,
  VHS_PROP,
  ARCADE_PROP,
  CHAIR,
  COUCH,
  ...DETAILS,
]);

export const ROOM = Object.freeze({
  bounds: BOUNDS,
  height: 3,
  walls: WALLS,
  doors: DOORS,
  props: PROPS,
  stations: STATIONS,
  start: Object.freeze({ x: 0, z: 3.0 }) as Vec2,
  startYaw: 0,
});
/** Every Collider: walls, door frames and all solid prop footprints (Stations included). */
export const COLLIDERS: readonly Aabb[] = Object.freeze([
  ...WALLS,
  ...DOORS.flatMap((d) => d.frames),
  ...PROPS.filter((p) => p.solid).map((p) => p.box),
]);

export const STATION_DEFS: readonly StationDef[] = STATIONS;
/** Rough triangle estimate: 12 per box (walls, props, floor, ceiling). */
export function estimateTriangles(): number {
  const frames = DOORS.reduce((n, d) => n + d.frames.length, 0);
  return (WALLS.length + frames + PROPS.length + 2) * 12;
}

/**
 * Breadth-first search over a grid of `step` spacing aligned to the bounds
 * minimum. A cell is walkable when a circle of `radius` at its centre lies
 * inside `bounds` and overlaps no Collider. 4-connected. Returns the centres
 * of all cells reachable from `start` (snapped to the nearest grid cell), or
 * an empty array if the start cell is not walkable.
 */
export function reachableCells(
  start: Vec2,
  colliders: readonly Aabb[] = COLLIDERS,
  bounds: Aabb = BOUNDS,
  radius: number = PLAYER_RADIUS,
  step = 0.1,
): Vec2[] {
  const nx = Math.floor((bounds.maxX - bounds.minX) / step) + 1;
  const nz = Math.floor((bounds.maxZ - bounds.minZ) / step) + 1;
  const centre = (i: number, j: number): Vec2 => ({
    x: bounds.minX + i * step,
    z: bounds.minZ + j * step,
  });
  const walkable = (i: number, j: number): boolean => {
    if (i < 0 || j < 0 || i >= nx || j >= nz) return false;
    const c = centre(i, j);
    if (
      c.x - radius < bounds.minX - 1e-9 ||
      c.x + radius > bounds.maxX + 1e-9 ||
      c.z - radius < bounds.minZ - 1e-9 ||
      c.z + radius > bounds.maxZ + 1e-9
    ) {
      return false;
    }
    return !overlapsAny(c, radius, colliders);
  };

  const si = Math.round((start.x - bounds.minX) / step);
  const sj = Math.round((start.z - bounds.minZ) / step);
  if (!walkable(si, sj)) return [];

  const seen = new Set<number>([sj * nx + si]);
  const queue: Array<[number, number]> = [[si, sj]];
  const out: Vec2[] = [];
  for (let head = 0; head < queue.length; head++) {
    const [i, j] = queue[head];
    out.push(centre(i, j));
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const ni = i + di;
      const nj = j + dj;
      const key = nj * nx + ni;
      if (!seen.has(key) && walkable(ni, nj)) {
        seen.add(key);
        queue.push([ni, nj]);
      }
    }
  }
  return out;
}
