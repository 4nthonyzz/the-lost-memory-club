import { describe, expect, it } from 'vitest';
import { PLAYER_RADIUS, INTERACTION_RANGE } from '../logic/constants';
import { overlapsAny } from '../logic/collision';
import { selectInteractionTarget } from '../logic/targeting';
import { COLLIDERS, ROOM, estimateTriangles, reachableCells } from './roomLayout';
import type { Aabb } from '../worldTypes';

const inside = (x: number, z: number, b: Aabb) =>
  x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;

describe('roomLayout', () => {
  it('has the specified bounds, height and four walls', () => {
    expect(ROOM.bounds).toEqual({ minX: -5, maxX: 5, minZ: -4, maxZ: 4 });
    expect(ROOM.height).toBe(3);
    expect(ROOM.walls).toHaveLength(4);
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
});
