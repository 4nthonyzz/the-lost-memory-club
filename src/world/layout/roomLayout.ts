/**
 * Milestone 1 room layout. Single source of truth for bounds, Colliders,
 * Station anchors and props. Pure data: no three.js, React or DOM imports.
 * Nothing here depends on `memoryShifted`.
 *
 * Axes: y up, yaw 0 looks toward -z. The player starts at the south side
 * (z = +3) and looks north. The VHS Station is the media console on the central archive island
 * (polish pass, task 18.1) and faces +z. The arcade Station stands against the east wall of the
 * Arcade_Area and faces -x, toward both doorways.
 */
import { PLAYER_RADIUS } from '../logic/constants';
import { overlapsAny } from '../logic/collision';
import type { Aabb, ArcadeGameKind, Facing, StationDef, Vec2 } from '../worldTypes';

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
  /** Direction the front face points toward. Omitted means '+z'. */
  facing?: Facing;
  /** Height of the bottom of the prop above the floor, for wall-mounted items. Omitted means 0. */
  elevation?: number;
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
  extra: { facing?: Facing; elevation?: number } = {},
): PropDef {
  return Object.freeze({
    id,
    kind,
    box: b,
    height,
    milestone,
    solid,
    ...(glbPath ? { glbPath } : {}),
    ...(extra.facing ? { facing: extra.facing } : {}),
    ...(extra.elevation !== undefined ? { elevation: extra.elevation } : {}),
  });
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

/**
 * Reception desk. Moved 0.7 m south in the polish pass (task 18.1, was z 0.5..1.3) so the island media
 * console keeps a 2.7 m open walkway between its south face (z -1.5) and the desk back (z 1.2).
 */
const DESK = prop('reception-desk', 'desk', box(-1.5, 1.5, 1.2, 2.0), 1.0);
const SHELF_A = prop('shelf-a', 'shelf', box(-5, -4.6, -2.6, -0.4), 2.2);
const SHELF_B = prop('shelf-b', 'shelf', box(-5, -4.6, 0.4, 2.6), 2.2);
const SHELF_C = prop('shelf-c', 'shelf', box(2, 4, 3.4, 4), 2.2, 3);

/**
 * Central archive island (task 18.1): a wide 1990s wooden media console, 1.8 m x 0.6 m, front on the
 * south face (z = 0) looking toward the spawn. The CRT, VCR, tape stacks and a small reference monitor
 * are parts on top of / inside this footprint. The prop id stays 'crt-vhs' (asset manifest mapping).
 * The prop height is the top of the CRT casing: console top 0.7 m + 0.6 m television.
 */
const VHS_PROP = prop('crt-vhs', 'station', box(-0.9, 0.9, -2.1, -1.5), 1.3, 1, true, undefined, { facing: '+z' });

/** North wall focal zone: two tall metal filing cabinets flanking a wall-mounted bulletin board. */
const FILING_A = prop('filing-cabinet-a', 'furniture', box(-3.5, -3.0, -4, -3.4), 1.4, 1, true, undefined, { facing: '+z' });
const FILING_B = prop('filing-cabinet-b', 'furniture', box(-1.5, -1.0, -4, -3.4), 1.4, 1, true, undefined, { facing: '+z' });
const BULLETIN = prop('bulletin-board', 'detail', box(-2.95, -1.55, -4, -3.95), 1.0, 1, false, undefined, { elevation: 1.1, facing: '+z' });
/** Floor decal framing the island, 3.2 m x 2.4 m centred on the console footprint. */
const RUG = prop('rug', 'detail', box(-1.6, 1.6, -2.5, -0.1), 0.01, 1, false, undefined, { elevation: 0.01 });
/**
 * Three interactive arcade cabinets against the east wall of the Arcade_Area (task 20.1), each 0.1 m clear
 * of the wall (x = 9.3), 0.2 m apart. Their front (west) faces are at x = 8.4 and look toward both doorways.
 * All three report the StationId 'arcade'; `arcadeGame` and `label` are layout data only.
 */
const ARCADE_SNAKE = prop('arcade-snake', 'station', box(8.4, 9.2, -1.7, -0.7), 1.8, 1, true, undefined, { facing: '-x' });
const ARCADE_MAZE = prop('arcade-maze', 'station', box(8.4, 9.2, -0.5, 0.5), 1.8, 1, true, undefined, { facing: '-x' });
const ARCADE_FREQUENCY = prop('arcade-frequency', 'station', box(8.4, 9.2, 0.7, 1.7), 1.8, 1, true, undefined, { facing: '-x' });

/**
 * Stacked CRT monitors. Moved out of the Arcade_Area (task 20.1) to the main room's north-east corner: the three
 * cabinets and their 1.2 m lanes from both doorways leave no free floor inside the Arcade_Area.
 */
const CRT_STACK = prop('crt-stack', 'furniture', box(4.3, 4.9, -3.2, -2.6), 1.0, 3, true, undefined, { facing: '-x' });

const CHAIR = prop('abandoned-chair', 'furniture', box(2.9, 3.5, 1.9, 2.5), 0.9, 3);
const COUCH = prop('couch', 'furniture', box(-3.9, -2.1, 2.6, 3.4), 0.9, 3);

const DETAILS: readonly PropDef[] = Object.freeze([
  // Crates moved to the main room's south-east corner (task 20.1) so the Arcade_Area keeps 1.2 m lanes from both
  // doorways to all three cabinet anchors.
  prop('crate-a', 'detail', box(4.3, 4.9, 3.1, 3.7), 0.6, 3),
  prop('crate-b', 'detail', box(4.3, 4.9, 2.4, 3.0), 0.5, 3),
  prop('tape-stack', 'detail', box(-0.6, -0.2, 1.4, 1.8), 0.15, 3, false),
  prop('poster-north', 'detail', box(0.5, 1.5, -4, -3.95), 1.0, 3, false),
  prop('poster-arcade-area', 'detail', box(7, 8, -2, -1.95), 1.0, 3, false),
  prop('cable-run', 'detail', box(-1, 1, -2.5, -2.45), 0.02, 3, false),
  // Archival tape boxes in three corners (visual only).
  prop('archive-boxes-nw', 'detail', box(-4.9, -4.3, -3.9, -3.4), 0.4, 3, false),
  prop('archive-boxes-ne', 'detail', box(4.1, 4.8, -3.9, -3.4), 0.4, 3, false),
  prop('archive-boxes-sw', 'detail', box(-4.9, -4.3, 3.3, 3.9), 0.4, 3, false),
  // Arcade_Area dressing, all visual only. The ARCADE sign hangs on the main-room face of the east wall
  // above both doorways (x 4.78 is 0.07 m in front of the lintel faces at x 4.85).
  prop('arcade-sign', 'detail', box(4.78, 5, -1.4, 1.4), 0.5, 3, false, undefined, { elevation: 2.3, facing: '-x' }),
  prop('arcade-runner', 'detail', box(5.5, 8.1, -0.45, 0.45), 0.01, 3, false),
  // Power cables run in the 0.2 m gaps between the cabinets (visual only, clear of the lanes).
  prop('arcade-cable-a', 'detail', box(8.5, 9.1, -0.62, -0.58), 0.02, 3, false),
  prop('arcade-cable-b', 'detail', box(8.5, 9.1, 0.58, 0.62), 0.02, 3, false),
]);

/** One arcade StationDef: anchor on the west face, centred on the cabinet; the id is always 'arcade'. */
function arcadeStation(p: PropDef, arcadeGame: ArcadeGameKind, label: string): StationDef {
  return Object.freeze({
    id: 'arcade' as const,
    arcadeGame,
    label,
    anchor: Object.freeze({ x: p.box.minX, z: (p.box.minZ + p.box.maxZ) / 2 }),
    collider: p.box,
    facing: '-x' as const,
  });
}

const STATIONS: readonly StationDef[] = Object.freeze([
  Object.freeze({
    id: 'vhs' as const,
    // Anchor on the south (player-facing) face, centred on the console.
    anchor: Object.freeze({ x: (VHS_PROP.box.minX + VHS_PROP.box.maxX) / 2, z: VHS_PROP.box.maxZ }),
    collider: VHS_PROP.box,
    facing: '+z' as const,
  }),
  arcadeStation(ARCADE_SNAKE, 'snake', 'SNAKE.EXE - The Hungry Tape'),
  arcadeStation(ARCADE_MAZE, 'maze', 'LAST EXIT - The Maze'),
  arcadeStation(ARCADE_FREQUENCY, 'frequency', 'DEAD FREQUENCY - The Lost Signal'),
]);

const PROPS: readonly PropDef[] = Object.freeze([
  DESK,
  SHELF_A,
  SHELF_B,
  SHELF_C,
  VHS_PROP,
  FILING_A,
  FILING_B,
  BULLETIN,
  RUG,
  ARCADE_SNAKE,
  ARCADE_MAZE,
  ARCADE_FREQUENCY,
  CRT_STACK,
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
