import { describe, expect, it } from 'vitest';
import { PLAYER_RADIUS, INTERACTION_RANGE } from '../logic/constants';
import { overlapsAny } from '../logic/collision';
import { segmentIntersectsAabb, selectInteractionStation, selectInteractionTarget } from '../logic/targeting';
import { COLLIDERS, ROOM, estimateTriangles, reachableCells } from './roomLayout';
import type { Aabb, Facing, StationDef, Vec2 } from '../worldTypes';

const inside = (x: number, z: number, b: Aabb) =>
  x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;

const arcadeStations = (): StationDef[] => ROOM.stations.filter((s) => s.id === 'arcade');
const CABINET_IDS = ['arcade-snake', 'arcade-maze', 'arcade-frequency'] as const;
/** Per-door standing spot in the main room, just outside the doorway, used for line-of-sight checks. */
const doorSpot = (d: (typeof ROOM.doors)[number]): Vec2 => ({ x: 4.4, z: (d.opening.minZ + d.opening.maxZ) / 2 });
const prop = (id: string) => ROOM.props.find((p) => p.id === id)!;
const FRONT: Record<Facing, Vec2> = {
  '+z': { x: 0, z: 1 },
  '-z': { x: 0, z: -1 },
  '+x': { x: 1, z: 0 },
  '-x': { x: -1, z: 0 },
};
/** Yaw that looks from `from` toward `to` (yaw 0 looks toward -z). */
const yawToward = (from: Vec2, to: Vec2) => Math.atan2(-(to.x - from.x), -(to.z - from.z));
/** Colliders of one door's passage, used to close it in a reachability search. */
const closeDoor = (d: (typeof ROOM.doors)[number]): Aabb => ({
  minX: 4.7,
  maxX: 5.6,
  minZ: d.opening.minZ,
  maxZ: d.opening.maxZ,
});
const distToBox = (p: Vec2, b: Aabb) =>
  Math.hypot(Math.max(b.minX - p.x, 0, p.x - b.maxX), Math.max(b.minZ - p.z, 0, p.z - b.maxZ));

describe('roomLayout', () => {
  it('has the full-archive bounds, height and wall Colliders', () => {
    expect(ROOM.bounds).toEqual({ minX: -5, maxX: 9.3, minZ: -4, maxZ: 4 });
    expect(ROOM.height).toBe(3);
    expect(ROOM.walls.length).toBeGreaterThanOrEqual(4);
    expect(Object.isFrozen(ROOM)).toBe(true);
    expect(Object.isFrozen(COLLIDERS)).toBe(true);
  });

  it('has a desk and at least two shelves', () => {
    expect(ROOM.props.filter((p) => p.kind === 'desk').length).toBeGreaterThanOrEqual(1);
    expect(ROOM.props.filter((p) => p.kind === 'shelf').length).toBeGreaterThanOrEqual(2);
  });

  it('keeps both Stations and anchors inside bounds', () => {
    expect(ROOM.stations.map((s) => s.id).sort()).toEqual(['arcade', 'arcade', 'arcade', 'vhs']);
    for (const s of ROOM.stations) {
      expect(inside(s.anchor.x, s.anchor.z, ROOM.bounds)).toBe(true);
      expect(s.collider.minX).toBeGreaterThanOrEqual(ROOM.bounds.minX);
      expect(s.collider.maxX).toBeLessThanOrEqual(ROOM.bounds.maxX);
      expect(s.collider.minZ).toBeGreaterThanOrEqual(ROOM.bounds.minZ);
      expect(s.collider.maxZ).toBeLessThanOrEqual(ROOM.bounds.maxZ);
      expect(COLLIDERS).toContain(s.collider);
    }
  });

  it('starts at (0, 3.0) yaw 0 without overlapping any Collider', () => {
    expect(ROOM.start).toEqual({ x: 0, z: 3.0 });
    expect(ROOM.startYaw).toBe(0);
    expect(overlapsAny(ROOM.start, PLAYER_RADIUS, COLLIDERS)).toBe(false);
  });

  it('puts the vhs Station on the central island facing +z', () => {
    const vhs = ROOM.stations.find((s) => s.id === 'vhs')!;
    expect(vhs.collider).toEqual({ minX: -0.9, maxX: 0.9, minZ: -2.1, maxZ: -1.5 });
    expect(vhs.collider).toBe(prop('crt-vhs').box);
    expect(vhs.facing).toBe('+z');
    expect(prop('crt-vhs').facing).toBe('+z');
    // Anchor on the south (player-facing) face, centred on the console.
    expect(vhs.anchor).toEqual({ x: 0, z: -1.5 });
    expect(vhs.collider.maxX - vhs.collider.minX).toBeCloseTo(1.8);
    expect(vhs.collider.maxZ - vhs.collider.minZ).toBeCloseTo(0.6);
    // The old north-wall CRT collider is gone.
    expect(COLLIDERS.some((c) => c.minZ === -4 && c.minX === -3 && c.maxX === -2)).toBe(false);
  });

  it('has three solid arcade cabinets on the east wall with the approved footprints, anchors, games and labels', () => {
    const area: Aabb = { minX: 5.3, maxX: 9.3, minZ: -2, maxZ: 2 };
    const expected = [
      { id: 'arcade-snake', game: 'snake', label: 'SNAKE.EXE - The Hungry Tape', z0: -1.7, z1: -0.7, az: -1.2 },
      { id: 'arcade-maze', game: 'maze', label: 'LAST EXIT - The Maze', z0: -0.5, z1: 0.5, az: 0 },
      { id: 'arcade-frequency', game: 'frequency', label: 'DEAD FREQUENCY - The Lost Signal', z0: 0.7, z1: 1.7, az: 1.2 },
    ];
    const stations = arcadeStations();
    expect(stations).toHaveLength(3);
    expect(ROOM.stations.filter((s) => s.id === 'vhs')).toHaveLength(1);
    expect(ROOM.props.some((p) => p.id === 'arcade-cabinet' || p.id === 'arcade-companion')).toBe(false);
    expected.forEach((e, i) => {
      const s = stations[i];
      const p = prop(e.id);
      expect(p.solid).toBe(true);
      expect(p.facing).toBe('-x');
      expect(p.box).toEqual({ minX: 8.4, maxX: 9.2, minZ: e.z0, maxZ: e.z1 });
      expect(COLLIDERS).toContain(p.box);
      expect(s.collider).toBe(p.box);
      expect(s.facing).toBe('-x');
      expect(s.arcadeGame).toBe(e.game);
      expect(s.label).toBe(e.label);
      expect(s.anchor).toEqual({ x: 8.4, z: e.az });
      // Inside the Arcade_Area with a gap to the east wall.
      expect(p.box.minX).toBeGreaterThanOrEqual(area.minX);
      expect(p.box.maxX).toBeLessThanOrEqual(area.maxX - 0.05);
      expect(p.box.minZ).toBeGreaterThanOrEqual(area.minZ);
      expect(p.box.maxZ).toBeLessThanOrEqual(area.maxZ);
    });
    // No overlap: neighbouring cabinets are 0.2 m apart.
    const boxes = CABINET_IDS.map((id) => prop(id).box);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const hit = a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
        expect(hit).toBe(false);
      }
    }
    expect(boxes[1].minZ - boxes[0].maxZ).toBeCloseTo(0.2);
    expect(boxes[2].minZ - boxes[1].maxZ).toBeCloseTo(0.2);
    // The only solid props inside the Arcade_Area are the three cabinets.
    const solidInArea = ROOM.props.filter(
      (p) => p.solid && p.box.minX >= area.minX && p.box.maxX <= area.maxX && p.box.minZ >= area.minZ && p.box.maxZ <= area.maxZ,
    );
    expect(solidInArea.map((p) => p.id).sort()).toEqual([...CABINET_IDS].sort());
  });

  it('moves the CRT stack and both crates out of the Arcade_Area, into the main room, clear of the doorways', () => {
    for (const id of ['crt-stack', 'crate-a', 'crate-b']) {
      const p = prop(id);
      expect(p.solid).toBe(true);
      expect(p.box.maxX).toBeLessThanOrEqual(5);
      expect(overlapsAny({ x: 4.4, z: -1.2 }, PLAYER_RADIUS, [p.box])).toBe(false);
      expect(overlapsAny({ x: 4.4, z: 1.2 }, PLAYER_RADIUS, [p.box])).toBe(false);
    }
  });

  it('lets the player reach an approach cell for each Station', () => {
    const cells = reachableCells(ROOM.start);
    expect(cells.length).toBeGreaterThan(0);
    for (const s of ROOM.stations) {
      const near = cells.filter(
        (c) => Math.hypot(c.x - s.anchor.x, c.z - s.anchor.z) <= INTERACTION_RANGE * 0.9,
      );
      expect(near.length).toBeGreaterThan(0);
    }
  });

  it('targets each Station (and each of the three cabinets) from a reachable cell in front of its face, excluding its own collider', () => {
    const cells = reachableCells(ROOM.start);
    for (const s of ROOM.stations) {
      const n = FRONT[s.facing ?? '+z'];
      // A cell 0.4 to 1.5 m straight out from the anchor along the facing direction.
      const c = cells.find((p) => {
        const along = (p.x - s.anchor.x) * n.x + (p.z - s.anchor.z) * n.z;
        const across = (p.x - s.anchor.x) * n.z - (p.z - s.anchor.z) * n.x;
        return along >= 0.4 && along <= 1.5 && Math.abs(across) < 0.05;
      });
      expect(c).toBeDefined();
      expect(selectInteractionTarget(c!, yawToward(c!, s.anchor), ROOM.stations, COLLIDERS)).toBe(s.id);
      // The selected entry is this very station, not another cabinet that shares the id.
      expect(selectInteractionStation(c!, yawToward(c!, s.anchor), ROOM.stations, COLLIDERS)).toBe(s);
    }
  });

  it('selects the nearest eligible cabinet, with ties going to the earlier entry in list order', () => {
    const [snake, maze, frequency] = arcadeStations();
    const at = (p: Vec2, towards: Vec2) => selectInteractionStation(p, yawToward(p, towards), ROOM.stations, COLLIDERS);
    // Directly in front of each cabinet, 1 m out: that cabinet is the nearest.
    expect(at({ x: 7.4, z: -1.2 }, snake.anchor)).toBe(snake);
    expect(at({ x: 7.4, z: 0 }, maze.anchor)).toBe(maze);
    expect(at({ x: 7.4, z: 1.2 }, frequency.anchor)).toBe(frequency);
    // Equidistant between two neighbours: the first in list order wins, and the id is still 'arcade'.
    expect(at({ x: 7.4, z: -0.6 }, { x: 8.4, z: -0.6 })).toBe(snake);
    expect(at({ x: 7.4, z: 0.6 }, { x: 8.4, z: 0.6 })).toBe(maze);
    expect(selectInteractionTarget({ x: 7.4, z: -0.6 }, yawToward({ x: 7.4, z: -0.6 }, { x: 8.4, z: -0.6 }), ROOM.stations, COLLIDERS)).toBe('arcade');
  });

  it('estimates well under 20,000 triangles', () => {
    expect(estimateTriangles()).toBeLessThan(20000);
  });

  it('has the full archive content: 3 shelves, 2 furniture, 2 doors, 5 details', () => {
    const count = (k: string) => ROOM.props.filter((p) => p.kind === k).length;
    expect(count('shelf')).toBeGreaterThanOrEqual(3);
    expect(count('furniture')).toBeGreaterThanOrEqual(2);
    expect(count('detail')).toBeGreaterThanOrEqual(5);
    expect(ROOM.doors.length).toBeGreaterThanOrEqual(2);
    for (const p of ROOM.props) expect(typeof p.milestone).toBe('number');
  });

  it('adds solid props as Colliders and keeps non-solid details out', () => {
    for (const p of ROOM.props) expect(COLLIDERS.includes(p.box)).toBe(p.solid);
  });

  it('counts Colliders: 9 walls, 4 door frames and 15 solid props (three cabinets replace the cabinet and its companion)', () => {
    expect(ROOM.walls).toHaveLength(9);
    expect(ROOM.props.filter((p) => p.solid)).toHaveLength(15);
    expect(COLLIDERS).toHaveLength(9 + 4 + 15);
    for (const id of [...CABINET_IDS, 'crt-stack', 'crt-vhs', 'filing-cabinet-a', 'filing-cabinet-b']) {
      expect(COLLIDERS).toContain(prop(id).box);
    }
  });

  it('flanks a non-solid wall-mounted bulletin board with two tall filing cabinets on the north wall', () => {
    const a = prop('filing-cabinet-a');
    const b = prop('filing-cabinet-b');
    const board = prop('bulletin-board');
    for (const c of [a, b]) {
      expect(c.solid).toBe(true);
      expect(c.box.minZ).toBe(-4);
      expect(c.height).toBeCloseTo(1.4);
      expect(c.box.maxX - c.box.minX).toBeCloseTo(0.5);
      expect(c.box.maxZ - c.box.minZ).toBeCloseTo(0.6);
    }
    expect(board.solid).toBe(false);
    expect(COLLIDERS).not.toContain(board.box);
    expect(board.elevation).toBeCloseTo(1.1);
    expect(board.box.minX).toBeGreaterThanOrEqual(a.box.maxX);
    expect(board.box.maxX).toBeLessThanOrEqual(b.box.minX);
    expect((board.box.minX + board.box.maxX) / 2).toBeCloseTo(-2.25);
  });

  it('keeps every prop footprint inside the room bounds and the rug and tape boxes non-solid', () => {
    for (const p of ROOM.props) {
      expect(p.box.minX).toBeGreaterThanOrEqual(ROOM.bounds.minX);
      expect(p.box.maxX).toBeLessThanOrEqual(ROOM.bounds.maxX);
      expect(p.box.minZ).toBeGreaterThanOrEqual(ROOM.bounds.minZ);
      expect(p.box.maxZ).toBeLessThanOrEqual(ROOM.bounds.maxZ);
    }
    const rug = prop('rug');
    expect(rug.solid).toBe(false);
    expect(rug.elevation).toBeCloseTo(0.01);
    expect(rug.box.maxX - rug.box.minX).toBeCloseTo(3.2);
    expect(rug.box.maxZ - rug.box.minZ).toBeCloseTo(2.4);
    const island = prop('crt-vhs').box;
    expect((rug.box.minX + rug.box.maxX) / 2).toBeCloseTo((island.minX + island.maxX) / 2);
    expect((rug.box.minZ + rug.box.maxZ) / 2).toBeCloseTo(-1.3);
    expect(rug.box).toEqual({ minX: -1.6, maxX: 1.6, minZ: -2.5, maxZ: -0.1 });
    // The rug frames the console but touches neither the desk nor the north filing cabinets.
    for (const id of ['reception-desk', 'filing-cabinet-a', 'filing-cabinet-b']) {
      const o = prop(id).box;
      const hit = rug.box.minX < o.maxX && rug.box.maxX > o.minX && rug.box.minZ < o.maxZ && rug.box.maxZ > o.minZ;
      expect(hit, id).toBe(false);
    }
    for (const p of ROOM.props.filter((q) => q.id.startsWith('archive-boxes'))) expect(p.solid).toBe(false);
  });

  it('keeps at least 1.2 m of walkway on all four sides of the island (computed from the layout)', () => {
    const island = prop('crt-vhs').box;
    const gap = (a: Aabb, b: Aabb) =>
      Math.hypot(
        Math.max(a.minX - b.maxX, b.minX - a.maxX, 0),
        Math.max(a.minZ - b.maxZ, b.minZ - a.maxZ, 0),
      );
    const others = COLLIDERS.filter((c) => c !== island);
    expect(others.length).toBe(COLLIDERS.length - 1);
    // Pairwise: every other solid collider (walls, frames, props) is at least 1.2 m away.
    const nearest = Math.min(...others.map((c) => gap(island, c)));
    expect(nearest).toBeGreaterThanOrEqual(1.2 - 1e-9);
    // Grid: no point within 1.2 m of the island lies inside any other collider.
    const R = 1.2;
    for (let x = island.minX - R; x <= island.maxX + R; x += 0.05) {
      for (let z = island.minZ - R; z <= island.maxZ + R; z += 0.05) {
        const p = { x, z };
        if (distToBox(p, island) >= R || distToBox(p, island) === 0) continue;
        for (const c of others) expect(distToBox(p, c)).toBeGreaterThan(0);
      }
    }
    // Per side: desk 2.7 m south, filing cabinets 1.3 m north-west, north wall 1.9 m, shelves 3.7 m west.
    expect(gap(island, prop('reception-desk').box)).toBeCloseTo(2.7);
    expect(gap(island, prop('filing-cabinet-b').box)).toBeGreaterThanOrEqual(1.3 - 1e-9);
    expect(island.minZ - ROOM.bounds.minZ).toBeCloseTo(1.9);
    expect(gap(island, prop('shelf-a').box)).toBeGreaterThanOrEqual(3.7 - 1e-9);
  });

  it('leaves a 2.7 m unobstructed walkway between the console front and the reception desk', () => {
    const island = prop('crt-vhs').box;
    const desk = prop('reception-desk').box;
    const walk: Aabb = { minX: island.minX - PLAYER_RADIUS, maxX: island.maxX + PLAYER_RADIUS, minZ: island.maxZ, maxZ: desk.minZ };
    expect(walk.maxZ - walk.minZ).toBeGreaterThanOrEqual(2.2);
    expect(walk.maxZ - walk.minZ).toBeCloseTo(2.7);
    for (const c of COLLIDERS) {
      const hit = walk.minX < c.maxX && walk.maxX > c.minX && walk.minZ < c.maxZ && walk.maxZ > c.minZ;
      expect(hit).toBe(false);
    }
  });

  it('keeps the spawn and a 1.0 m disc around it clear of colliders (desk edge and south wall are exactly 1.0 m away)', () => {
    expect(ROOM.start).toEqual({ x: 0, z: 3 });
    expect(overlapsAny(ROOM.start, 0.99, COLLIDERS)).toBe(false);
    expect(overlapsAny(ROOM.start, 1.2, COLLIDERS)).toBe(true);
  });

  it('reaches both Stations and the area behind the island near the bulletin board and filing cabinets', () => {
    const cells = reachableCells(ROOM.start);
    const near = (x: number, z: number) => cells.some((c) => Math.hypot(c.x - x, c.z - z) < 0.06);
    for (const s of ROOM.stations) expect(cells.some((c) => Math.hypot(c.x - s.anchor.x, c.z - s.anchor.z) <= INTERACTION_RANGE * 0.9)).toBe(true);
    // Between the island back (z -2.1) and the cabinets (z -3.4), in front of the bulletin board (x -2.25).
    expect(near(-2.2, -2.8)).toBe(true);
    expect(near(0, -2.8)).toBe(true);
    expect(near(-1.25, -2.8)).toBe(true);
  });

  it('selects vhs from a reachable cell in front of the console, within range and cone', () => {
    const vhs = ROOM.stations.find((s) => s.id === 'vhs')!;
    const cells = reachableCells(ROOM.start);
    const c = cells.find((p) => Math.abs(p.x - vhs.anchor.x) < 0.05 && Math.abs(p.z - (vhs.anchor.z + 0.8)) < 0.05)!;
    expect(c).toBeDefined();
    expect(Math.hypot(c.x - vhs.anchor.x, c.z - vhs.anchor.z)).toBeLessThanOrEqual(INTERACTION_RANGE);
    expect(selectInteractionTarget(c, yawToward(c, vhs.anchor), ROOM.stations, COLLIDERS)).toBe('vhs');
    // A few degrees off to the side is still inside the cone.
    expect(selectInteractionTarget(c, yawToward(c, vhs.anchor) + 0.2, ROOM.stations, COLLIDERS)).toBe('vhs');
  });

  it('keeps the sign, runner and cable runs visual only', () => {
    for (const id of ['arcade-sign', 'arcade-runner', 'arcade-cable-a', 'arcade-cable-b']) {
      const p = prop(id);
      expect(p.solid).toBe(false);
      expect(COLLIDERS).not.toContain(p.box);
      expect(typeof p.milestone).toBe('number');
    }
  });

  it('hangs the sign above both doorways on the main-room side, clear of the arcade poster', () => {
    const sign = prop('arcade-sign');
    expect(sign.box.maxX).toBeLessThanOrEqual(5);
    expect(sign.elevation).toBeGreaterThanOrEqual(2.1);
    expect((sign.elevation ?? 0) + sign.height).toBeLessThanOrEqual(ROOM.height);
    for (const d of ROOM.doors) {
      const mid = (d.opening.minZ + d.opening.maxZ) / 2;
      expect(sign.box.minZ).toBeLessThanOrEqual(mid);
      expect(sign.box.maxZ).toBeGreaterThanOrEqual(mid);
    }
    const poster = prop('poster-arcade-area');
    const apart = sign.box.maxX < poster.box.minX || poster.box.maxX < sign.box.minX;
    expect(apart).toBe(true);
  });

  it('door frames block, openings do not', () => {
    for (const d of ROOM.doors) {
      for (const f of d.frames) expect(COLLIDERS).toContain(f);
      const mid = {
        x: (d.opening.minX + d.opening.maxX) / 2,
        z: (d.opening.minZ + d.opening.maxZ) / 2,
      };
      expect(overlapsAny(mid, PLAYER_RADIUS, COLLIDERS)).toBe(false);
      for (const f of d.frames) {
        const fc = { x: (f.minX + f.maxX) / 2, z: (f.minZ + f.maxZ) / 2 };
        expect(overlapsAny(fc, PLAYER_RADIUS, COLLIDERS)).toBe(true);
      }
    }
  });

  it('reaches the Arcade_Area and every Station from the start through the doors', () => {
    const cells = reachableCells(ROOM.start);
    // The player circle (0.35 m) stops at x = 8.05 in front of the cabinet faces (x = 8.4).
    expect(cells.some((c) => c.x > 7.9 && Math.abs(c.z) < 1)).toBe(true);
    for (const d of ROOM.doors) {
      const mid = { x: 5.15, z: (d.opening.minZ + d.opening.maxZ) / 2 };
      expect(cells.some((c) => Math.hypot(c.x - mid.x, c.z - mid.z) < 0.15)).toBe(true);
    }
    for (const s of ROOM.stations) {
      expect(cells.some((c) => Math.hypot(c.x - s.anchor.x, c.z - s.anchor.z) <= 1.8)).toBe(true);
    }
  });

  it('reaches a cell in front of every cabinet anchor through each door separately', () => {
    for (const [i, open] of ROOM.doors.entries()) {
      const other = ROOM.doors[1 - i];
      const cells = reachableCells(ROOM.start, [...COLLIDERS, closeDoor(other)]);
      // The closed door really is closed: nothing reachable inside its opening.
      const oz = (other.opening.minZ + other.opening.maxZ) / 2;
      expect(cells.some((c) => Math.abs(c.x - 5.15) < 0.15 && Math.abs(c.z - oz) < 0.15)).toBe(false);
      // The open door still leads to a cell right in front of each cabinet's west face.
      const mid = { x: 5.15, z: (open.opening.minZ + open.opening.maxZ) / 2 };
      expect(cells.some((c) => Math.hypot(c.x - mid.x, c.z - mid.z) < 0.15)).toBe(true);
      for (const a of arcadeStations()) {
        const front = cells.filter(
          (c) => c.x < a.anchor.x && a.anchor.x - c.x <= 1.0 && Math.abs(c.z - a.anchor.z) <= 0.3,
        );
        expect(front.length, `${a.arcadeGame} via ${open.id}`).toBeGreaterThan(0);
      }
      expect(cells.every((c) => !overlapsAny(c, PLAYER_RADIUS, COLLIDERS))).toBe(true);
    }
  });

  it('keeps a 1.2 m wide lane from each door to every cabinet anchor free of solid props', () => {
    let narrowest = Infinity;
    for (const a of arcadeStations()) {
      // Other solid props, including the neighbouring cabinets. The target cabinet's own collider is excluded.
      const solid = ROOM.props.filter((p) => p.solid && p.box !== a.collider);
      for (const d of ROOM.doors) {
        const start = { x: 5.6, z: (d.opening.minZ + d.opening.maxZ) / 2 };
        // Doorway to a point 1 m in front of the cabinet, then straight in to the anchor.
        const approach = { x: a.anchor.x - 1.0, z: a.anchor.z };
        for (const [from, to] of [[start, approach], [approach, a.anchor]] as const) {
          for (let t = 0; t <= 1; t += 0.01) {
            const p = { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t };
            for (const s of solid) {
              const gap = distToBox(p, s.box);
              narrowest = Math.min(narrowest, gap);
              expect(gap, `${a.arcadeGame} via ${d.id} vs ${s.id}`).toBeGreaterThanOrEqual(0.6 - 1e-6);
            }
          }
        }
      }
    }
    // Half-width 0.6 m on each side of the centre line is a 1.2 m lane.
    expect(narrowest * 2).toBeGreaterThanOrEqual(1.2 - 1e-6);
  });

  it('keeps door openings from blocking line of sight to the cabinets on the same side and to the middle one', () => {
    const [snake, maze, frequency] = arcadeStations();
    const cells = reachableCells(ROOM.start);
    const pairs: Array<[(typeof ROOM.doors)[number], StationDef[]]> = [
      [ROOM.doors[0], [snake, maze]],
      [ROOM.doors[1], [maze, frequency]],
    ];
    for (const [d, targets] of pairs) {
      const z = doorSpot(d).z;
      const spot = cells.find((c) => Math.abs(c.x - 4.4) < 0.05 && Math.abs(c.z - z) < 0.05)!;
      expect(spot).toBeDefined();
      for (const a of targets) {
        for (const box of COLLIDERS) {
          if (box === a.collider) continue;
          expect(segmentIntersectsAabb(spot, a.anchor, box), `${d.id} -> ${a.arcadeGame}`).toBe(false);
        }
      }
    }
  });

  it('selects an arcade cabinet from just inside the Arcade_Area, in front of either doorway', () => {
    const [snake, maze, frequency] = arcadeStations();
    const cells = reachableCells(ROOM.start);
    for (const d of ROOM.doors) {
      const zMid = (d.opening.minZ + d.opening.maxZ) / 2;
      const spot = cells.find((c) => Math.abs(c.x - 6.8) < 0.05 && Math.abs(c.z - zMid * 0.5) < 0.05)!;
      expect(spot).toBeDefined();
      expect(Math.hypot(spot.x - maze.anchor.x, spot.z - maze.anchor.z)).toBeLessThanOrEqual(INTERACTION_RANGE);
      const picked = selectInteractionStation(spot, yawToward(spot, maze.anchor), ROOM.stations, COLLIDERS);
      expect([snake, maze, frequency]).toContain(picked);
      expect(selectInteractionTarget(spot, yawToward(spot, maze.anchor), ROOM.stations, COLLIDERS)).toBe('arcade');
    }
  });

  it('sees a cabinet through a doorway but not past the pillar or a door frame', () => {
    // The cabinets are more than 2 m from the doorways, so widen the range to test only occlusion.
    const far = 10;
    const [, maze] = arcadeStations();
    const throughDoor = { x: 4.4, z: -1.2 };
    expect(selectInteractionTarget(throughDoor, yawToward(throughDoor, maze.anchor), ROOM.stations, COLLIDERS, far)).toBe('arcade');
    const behindPillar = { x: 4.4, z: 0 };
    expect(selectInteractionTarget(behindPillar, yawToward(behindPillar, maze.anchor), ROOM.stations, COLLIDERS, far)).toBeNull();
    const behindWall = { x: 4.4, z: -2.5 };
    expect(selectInteractionTarget(behindWall, yawToward(behindWall, maze.anchor), ROOM.stations, COLLIDERS, far)).toBeNull();
  });

  it('keeps the power cables in the gaps between the cabinets, visual only', () => {
    const [a, b] = [prop('arcade-cable-a').box, prop('arcade-cable-b').box];
    expect(a.minZ).toBeGreaterThanOrEqual(prop('arcade-snake').box.maxZ);
    expect(a.maxZ).toBeLessThanOrEqual(prop('arcade-maze').box.minZ);
    expect(b.minZ).toBeGreaterThanOrEqual(prop('arcade-maze').box.maxZ);
    expect(b.maxZ).toBeLessThanOrEqual(prop('arcade-frequency').box.minZ);
  });
});
