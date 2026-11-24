import { describe, expect, it } from 'vitest';
import { PLAYER_RADIUS, INTERACTION_RANGE } from '../logic/constants';
import { overlapsAny } from '../logic/collision';
import { segmentIntersectsAabb, selectInteractionTarget } from '../logic/targeting';
import { COLLIDERS, ROOM, estimateTriangles, reachableCells } from './roomLayout';
import type { Aabb, StationDef } from '../worldTypes';

const inside = (x: number, z: number, b: Aabb) =>
  x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;

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
    expect(ROOM.stations.map((s) => s.id).sort()).toEqual(['arcade', 'vhs']);
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

  it('targets each Station from a reachable cell facing it, excluding its own collider', () => {
    const cells = reachableCells(ROOM.start);
    for (const s of ROOM.stations) {
      const c = cells.find(
        (p) => Math.abs(p.x - s.anchor.x) < 0.05 && p.z > s.anchor.z && p.z - s.anchor.z <= 1.5,
      );
      expect(c).toBeDefined();
      expect(selectInteractionTarget(c!, 0, ROOM.stations, COLLIDERS)).toBe(s.id);
    }
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
    expect(cells.some((c) => c.x > 8 && Math.abs(c.z) < 1)).toBe(true);
    for (const d of ROOM.doors) {
      const mid = { x: 5.15, z: (d.opening.minZ + d.opening.maxZ) / 2 };
      expect(cells.some((c) => Math.hypot(c.x - mid.x, c.z - mid.z) < 0.15)).toBe(true);
    }
    for (const s of ROOM.stations) {
      expect(cells.some((c) => Math.hypot(c.x - s.anchor.x, c.z - s.anchor.z) <= 1.8)).toBe(true);
    }
  });

  it('keeps door openings from blocking line of sight to the arcade Station', () => {
    const arcade = ROOM.stations.find((s) => s.id === 'arcade')!;
    const cells = reachableCells(ROOM.start);
    for (const d of ROOM.doors) {
      const zMid = (d.opening.minZ + d.opening.maxZ) / 2;
      const spot = cells.find((c) => Math.abs(c.x - 4.4) < 0.05 && Math.abs(c.z - zMid) < 0.05)!;
      expect(spot).toBeDefined();
      for (const box of COLLIDERS) {
        if (box === arcade.collider) continue;
        expect(segmentIntersectsAabb(spot, arcade.anchor, box)).toBe(false);
      }
    }
  });

  it('selects a Station through a doorway and not past a door frame', () => {
    // Synthetic Station inside the Arcade_Area, in line with the north door.
    const inArea: StationDef = {
      id: 'arcade',
      anchor: { x: 6.2, z: -1.2 },
      collider: { minX: 6.2, maxX: 7, minZ: -1.4, maxZ: -1.2 },
    };
    const yawEast = -Math.PI / 2;
    const throughDoor = { x: 4.4, z: -1.2 };
    expect(selectInteractionTarget(throughDoor, yawEast, [inArea], COLLIDERS)).toBe('arcade');
    const behindWall = { x: 4.4, z: -2.5 };
    const toward = Math.atan2(-(inArea.anchor.x - behindWall.x), -(inArea.anchor.z - behindWall.z));
    expect(selectInteractionTarget(behindWall, toward, [inArea], COLLIDERS)).toBeNull();
  });
});