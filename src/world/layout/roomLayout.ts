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
  kind: 'desk' | 'shelf' | 'station';
  /** Footprint on the floor plane. Doubles as the Collider. */
  box: Aabb;
  /** Height of the box in metres (render hint only). */
  height: number;
}

function box(minX: number, maxX: number, minZ: number, maxZ: number): Aabb {
  return Object.freeze({ minX, maxX, minZ, maxZ });
}

function prop(id: string, kind: PropDef['kind'], b: Aabb, height: number): PropDef {
  return Object.freeze({ id, kind, box: b, height });
}

const BOUNDS: Aabb = box(-5, 5, -4, 4);
const WALL_THICKNESS = 0.3;

/** Four wall Colliders, just outside the room bounds. */
const WALLS: readonly Aabb[] = Object.freeze([
  box(-5 - WALL_THICKNESS, 5 + WALL_THICKNESS, -4 - WALL_THICKNESS, -4), // north
  box(-5 - WALL_THICKNESS, 5 + WALL_THICKNESS, 4, 4 + WALL_THICKNESS), // south
  box(-5 - WALL_THICKNESS, -5, -4, 4), // west
  box(5, 5 + WALL_THICKNESS, -4, 4), // east
]);

const DESK = prop('reception-desk', 'desk', box(-1.5, 1.5, 0.5, 1.3), 1.0);
const SHELF_A = prop('shelf-a', 'shelf', box(-5, -4.6, -2, 2), 2.2);
const SHELF_B = prop('shelf-b', 'shelf', box(4.6, 5, -2, 2), 2.2);

/** CRT television on a stand against the north wall; front face at z = -3.4. */
const VHS_PROP = prop('crt-vhs', 'station', box(-3, -2, -4, -3.4), 1.2);
/** Arcade cabinet against the north wall; front face at z = -3.2. */
const ARCADE_PROP = prop('arcade-cabinet', 'station', box(2, 3, -4, -3.2), 1.8);

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

const PROPS: readonly PropDef[] = Object.freeze([DESK, SHELF_A, SHELF_B, VHS_PROP, ARCADE_PROP]);

export const ROOM = Object.freeze({
  bounds: BOUNDS,
  height: 3,
  walls: WALLS,
  props: PROPS,
  stations: STATIONS,
  start: Object.freeze({ x: 0, z: 3.0 }) as Vec2,
  startYaw: 0,
});

/** Every Collider: four walls plus all prop footprints (Stations included). */
export const COLLIDERS: readonly Aabb[] = Object.freeze([...WALLS, ...PROPS.map((p) => p.box)]);

export const STATION_DEFS: readonly StationDef[] = STATIONS;

/** Rough triangle estimate: 12 per box (walls, props, floor, ceiling). */
export function estimateTriangles(): number {
  return (WALLS.length + PROPS.length + 2) * 12;
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
