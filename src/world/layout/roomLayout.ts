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
import type { Aabb, ArcadeGameKind, Facing, InteractableDef, ManualId, StationDef, Vec2 } from '../worldTypes';

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

/** Framed ARCHIVE / MEMBERS ONLY poster on the Arcade_Area north wall (visual; also the 'poster-archive' readable, task 25.2). */
const ARCADE_POSTER = prop('poster-arcade-area', 'detail', box(7, 8, -2, -1.95), 1.0, 3, false);

const DETAILS: readonly PropDef[] = Object.freeze([
  // Crates moved to the main room's south-east corner (task 20.1) so the Arcade_Area keeps 1.2 m lanes from both
  // doorways to all three cabinet anchors.
  prop('crate-a', 'detail', box(4.3, 4.9, 3.1, 3.7), 0.6, 3),
  prop('crate-b', 'detail', box(4.3, 4.9, 2.4, 3.0), 0.5, 3),
  prop('tape-stack', 'detail', box(-0.6, -0.2, 1.4, 1.8), 0.15, 3, false),
  // Two desk lamps on the reception desk top (task 23.1), visual only: a green-shaded banker's lamp on the
  // left (shade offset west of its base) and a cream-shaded table lamp on the right. `elevation` is the desk top.
  prop('desk-lamp-left', 'detail', box(-1.44, -1.1, 1.38, 1.52), 0.34, 3, false, undefined, { elevation: 1.0 }),
  prop('desk-lamp-right', 'detail', box(1.14, 1.4, 1.32, 1.58), 0.4, 3, false, undefined, { elevation: 1.0 }),
  prop('poster-north', 'detail', box(0.5, 1.5, -4, -3.95), 1.0, 3, false),
  ARCADE_POSTER,
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

/** Interaction range of a world-local prop (lamps and manuals), in metres. */
export const PROP_INTERACTION_RANGE = 2.2;

/**
 * The three arcade manuals stand in one row on level 2 of the west bookcase `shelf-b` (board top at about
 * y 1.12, books up to y 1.4), spines facing +x at the bookcase front. They replace ordinary books in that
 * row and are not solid: they live inside the bookcase volume. `z` is the book centre along the wall.
 */
export const MANUAL_PLACEMENT = Object.freeze({
  shelfId: 'shelf-b',
  level: 2,
  /**
   * Task 28.2: each manual is a 0.085 (along z) x 0.31 x 0.29 m (along x) volume whose spine face is at x -4.555, so the book is pulled
   * 0.08 m toward +x compared with the flush row (spines at -4.635) and sticks out 0.045 m past the bookcase front (x -4.6). The
   * volumes are non-solid. Back face at x -4.845.
   */
  spineX: -4.555,
  backX: -4.845,
  thickness: 0.085,
  books: Object.freeze([
    Object.freeze({ id: 'manual-snake' as const, z: 1.4 }),
    Object.freeze({ id: 'manual-maze' as const, z: 1.8 }),
    Object.freeze({ id: 'manual-frequency' as const, z: 2.2 }),
  ]),
});

function lampDef(id: 'desk-lamp-left' | 'desk-lamp-right'): InteractableDef {
  const b = DETAILS.find((p) => p.id === id)!.box;
  return Object.freeze({
    id,
    kind: 'lamp' as const,
    anchor: Object.freeze({ x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 }),
    // The lamps stand on the solid desk, so its footprint must not occlude them.
    collider: DESK.box,
    range: PROP_INTERACTION_RANGE,
    height: 1.2,
  });
}

function manualDef(id: ManualId, z: number): InteractableDef {
  return Object.freeze({
    id,
    kind: 'manual' as const,
    // Task 28.2: 0.035 m in front of the protruding spine face (x -4.555), centred on the book.
    anchor: Object.freeze({ x: -4.52, z }),
    // The book's own footprint is excluded from its line-of-sight test (it is not in COLLIDERS; this box only identifies it).
    collider: box(MANUAL_PLACEMENT.backX, MANUAL_PLACEMENT.spineX, z - MANUAL_PLACEMENT.thickness / 2, z + MANUAL_PLACEMENT.thickness / 2),
    range: PROP_INTERACTION_RANGE,
    height: 1.25,
  });
}

/**
 * Readable notes (task 24.2). All three are non-solid and visual only; their anchors sit on the object itself.
 *  - desk-notebook: the notepad on the reception desk (deskParts: x = desk centre - 0.58, z = desk centre + 0.02; moved in 25.1 so the left lamp is no longer stolen by the notebook,
 *    on the desk top). The solid desk footprint is excluded from its line-of-sight test, like the lamps.
 *  - cork-board: the north-wall bulletin board between the two filing cabinets, anchored at the board centre on the wall face.
 *  - poster-shift: the Memory_Shift overlay poster (north wall, x -0.3, z -3.94; see ShiftDressing in Props.tsx). It is
 *    invisible at t = 0, so requiresShift makes targeting exclude it until memoryShifted is true.
 */
function noteDefs(): InteractableDef[] {
  const dx = (DESK.box.minX + DESK.box.maxX) / 2;
  const dz = (DESK.box.minZ + DESK.box.maxZ) / 2;
  return [
    Object.freeze({
      id: 'desk-notebook' as const,
      kind: 'note' as const,
      anchor: Object.freeze({ x: dx - 0.58, z: dz + 0.02 }),
      collider: DESK.box,
      range: PROP_INTERACTION_RANGE,
      height: 1.0,
    }),
    Object.freeze({
      id: 'cork-board' as const,
      kind: 'note' as const,
      anchor: Object.freeze({ x: (BULLETIN.box.minX + BULLETIN.box.maxX) / 2, z: BULLETIN.box.maxZ }),
      collider: BULLETIN.box,
      range: PROP_INTERACTION_RANGE,
      height: 1.6,
    }),
    Object.freeze({
      id: 'poster-shift' as const,
      kind: 'note' as const,
      anchor: Object.freeze({ x: -0.3, z: -3.94 }),
      range: PROP_INTERACTION_RANGE,
      height: 1.7,
      requiresShift: true,
    }),
    // Task 25.2: the framed ARCHIVE / MEMBERS ONLY poster on the Arcade_Area north wall (prop 'poster-arcade-area', centre
    // x 7.5, face at z -1.945). The anchor is its real position, 0.02 m into the room from the wall face (z -1.95). Always
    // targetable (it is not a Memory_Shift overlay). Its own small box is excluded from its line-of-sight test.
    Object.freeze({
      id: 'poster-archive' as const,
      kind: 'note' as const,
      anchor: Object.freeze({
        x: (ARCADE_POSTER.box.minX + ARCADE_POSTER.box.maxX) / 2,
        z: ARCADE_POSTER.box.maxZ + 0.02,
      }),
      collider: ARCADE_POSTER.box,
      range: PROP_INTERACTION_RANGE,
      height: 1.7,
    }),
  ];
}

/**
 * World-local interactable props (nine): the two desk lamps, the three manuals, then the desk notebook, the cork
 * board, the Memory_Shift poster and the Arcade_Area Club Archive Notice. Not Stations, not Colliders.
 */
export const INTERACTABLE_DEFS: readonly InteractableDef[] = Object.freeze([
  lampDef('desk-lamp-left'),
  lampDef('desk-lamp-right'),
  ...MANUAL_PLACEMENT.books.map((m) => manualDef(m.id, m.z)),
  ...noteDefs(),
]);
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
