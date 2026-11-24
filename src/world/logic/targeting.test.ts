import { describe, expect, it } from 'vitest';
import type { Aabb, StationDef } from '../worldTypes';
import { INTERACTION_CONE_DEG, INTERACTION_RANGE } from './constants';
import { segmentIntersectsAabb, selectInteractionTarget } from './targeting';

// Player at origin, yaw 0 looks toward -z.
const ORIGIN = { x: 0, z: 0 };

function station(id: 'vhs' | 'arcade', x: number, z: number): StationDef {
  // Own collider sits behind the anchor (further from the player at origin).
  const collider: Aabb = { minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.5, maxZ: z };
  return { id, anchor: { x, z }, collider };
}

describe('segmentIntersectsAabb', () => {
  const box: Aabb = { minX: -1, maxX: 1, minZ: -3, maxZ: -2 };

  it('detects a crossing segment', () => {
    expect(segmentIntersectsAabb({ x: 0, z: 0 }, { x: 0, z: -5 }, box)).toBe(true);
  });

  it('misses a segment that stops short or passes beside', () => {
    expect(segmentIntersectsAabb({ x: 0, z: 0 }, { x: 0, z: -1.9 }, box)).toBe(false);
    expect(segmentIntersectsAabb({ x: 2, z: 0 }, { x: 2, z: -5 }, box)).toBe(false);
  });

  it('counts touching the boundary as intersecting', () => {
    expect(segmentIntersectsAabb({ x: 0, z: 0 }, { x: 0, z: -2 }, box)).toBe(true);
  });

  it('handles a degenerate (point) segment inside and outside', () => {
    expect(segmentIntersectsAabb({ x: 0, z: -2.5 }, { x: 0, z: -2.5 }, box)).toBe(true);
    expect(segmentIntersectsAabb({ x: 0, z: 0 }, { x: 0, z: 0 }, box)).toBe(false);
  });
});

describe('selectInteractionTarget', () => {
  it('returns null with no stations', () => {
    expect(selectInteractionTarget(ORIGIN, 0, [], [])).toBeNull();
  });

  it('selects a Station in front within range', () => {
    const s = station('vhs', 0, -1.5);
    expect(selectInteractionTarget(ORIGIN, 0, [s], [s.collider])).toBe('vhs');
  });

  it('treats a Station exactly at range as eligible and beyond as not', () => {
    const at = station('vhs', 0, -INTERACTION_RANGE);
    const beyond = station('vhs', 0, -INTERACTION_RANGE - 0.01);
    expect(selectInteractionTarget(ORIGIN, 0, [at], [at.collider])).toBe('vhs');
    expect(selectInteractionTarget(ORIGIN, 0, [beyond], [beyond.collider])).toBeNull();
  });

  it('treats yaw exactly at the cone edge as eligible and beyond as not', () => {
    const s = station('vhs', 0, -1.5);
    const edge = (INTERACTION_CONE_DEG * Math.PI) / 180;
    expect(selectInteractionTarget(ORIGIN, edge, [s], [s.collider])).toBe('vhs');
    expect(selectInteractionTarget(ORIGIN, -edge, [s], [s.collider])).toBe('vhs');
    expect(selectInteractionTarget(ORIGIN, edge + 0.01, [s], [s.collider])).toBeNull();
  });

  it('returns null when the Station is behind the player', () => {
    const s = station('vhs', 0, -1.5);
    expect(selectInteractionTarget(ORIGIN, Math.PI, [s], [s.collider])).toBeNull();
  });

  it('excludes a Station when a Collider lies between player and anchor', () => {
    const s = station('vhs', 0, -1.8);
    const wall: Aabb = { minX: -1, maxX: 1, minZ: -1.2, maxZ: -1.0 };
    expect(selectInteractionTarget(ORIGIN, 0, [s], [s.collider, wall])).toBeNull();
  });

  it('does not let the Station own Collider occlude itself', () => {
    const s = station('arcade', 0, -1.5);
    // Passed as a separate copy with equal values.
    expect(selectInteractionTarget(ORIGIN, 0, [s], [{ ...s.collider }])).toBe('arcade');
  });

  it('picks the nearest of two eligible Stations', () => {
    const far = station('vhs', 0, -1.9);
    const near = station('arcade', 0.2, -1.0);
    expect(selectInteractionTarget(ORIGIN, 0, [far, near], [far.collider, near.collider])).toBe('arcade');
  });

  it('breaks distance ties by list order', () => {
    const a = station('vhs', -1, 0);
    const b = station('arcade', 1, 0);
    // Yaw 0 with both at 90 degrees: widen the cone so both qualify.
    expect(selectInteractionTarget(ORIGIN, 0, [a, b], [], 2, 180)).toBe('vhs');
    expect(selectInteractionTarget(ORIGIN, 0, [b, a], [], 2, 180)).toBe('arcade');
  });

  it('is unaffected by pitch because pitch is not an input', () => {
    const s = station('vhs', 0, -1.5);
    expect(selectInteractionTarget.length).toBeGreaterThanOrEqual(4);
    expect(selectInteractionTarget(ORIGIN, 0, [s], [])).toBe('vhs');
  });
});
