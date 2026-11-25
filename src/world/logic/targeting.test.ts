import { describe, expect, it } from 'vitest';
import { COLLIDERS, INTERACTABLE_DEFS, PROP_INTERACTION_RANGE, ROOM, STATION_DEFS, reachableCells } from '../layout/roomLayout';
import type { Aabb, InteractableDef, StationDef } from '../worldTypes';
import { INTERACTION_CONE_DEG, INTERACTION_RANGE } from './constants';
import { segmentIntersectsAabb, selectInteractionStation, selectInteractionTarget, selectInteractionTargetAll } from './targeting';

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

describe('selectInteractionTargetAll (stations and world-local props, task 23.2)', () => {
  const prop = (id: InteractableDef['id'], x: number, z: number, kind: InteractableDef['kind'] = 'lamp'): InteractableDef => ({
    id,
    kind,
    anchor: { x, z },
    range: PROP_INTERACTION_RANGE,
  });
  const kindOf = (t: ReturnType<typeof selectInteractionTargetAll>) =>
    t === null ? null : t.type === 'station' ? `station:${t.station.id}` : `prop:${t.prop.id}`;

  it('selects a prop within 2.2 m and the cone, and not beyond 2.2 m or outside the cone', () => {
    const at = prop('desk-lamp-left', 0, -PROP_INTERACTION_RANGE);
    const beyond = prop('desk-lamp-left', 0, -PROP_INTERACTION_RANGE - 0.01);
    expect(kindOf(selectInteractionTargetAll(ORIGIN, 0, [], [at], []))).toBe('prop:desk-lamp-left');
    expect(selectInteractionTargetAll(ORIGIN, 0, [], [beyond], [])).toBeNull();
    // 2.1 m: inside the prop range although outside the 2.0 m Station range.
    expect(kindOf(selectInteractionTargetAll(ORIGIN, 0, [], [prop('desk-lamp-right', 0, -2.1)], []))).toBe('prop:desk-lamp-right');
    expect(selectInteractionTargetAll(ORIGIN, Math.PI, [], [at], [])).toBeNull();
  });

  it('applies line of sight to props and ignores the prop own collider', () => {
    const own: Aabb = { minX: -0.5, maxX: 0.5, minZ: -1.8, maxZ: -1.2 };
    const p = { ...prop('desk-lamp-left', 0, -1.5), collider: own };
    expect(kindOf(selectInteractionTargetAll(ORIGIN, 0, [], [p], [{ ...own }]))).toBe('prop:desk-lamp-left');
    const wall: Aabb = { minX: -1, maxX: 1, minZ: -1.0, maxZ: -0.9 };
    expect(selectInteractionTargetAll(ORIGIN, 0, [], [p], [own, wall])).toBeNull();
  });

  it('nearest wins between a Station and a prop; a prop never steals a nearer Station', () => {
    const s = station('vhs', 0, -1.0);
    const farProp = prop('desk-lamp-left', 0.1, -1.8);
    expect(kindOf(selectInteractionTargetAll(ORIGIN, 0, [s], [farProp], [s.collider]))).toBe('station:vhs');
    const nearProp = prop('desk-lamp-left', 0.1, -0.6);
    expect(kindOf(selectInteractionTargetAll(ORIGIN, 0, [s], [nearProp], [s.collider]))).toBe('prop:desk-lamp-left');
  });

  it('breaks distance ties with Stations first, then list order', () => {
    const s = station('arcade', 0, -1.5);
    const p = prop('manual-maze', 0, -1.5, 'manual');
    const q = prop('manual-snake', 0, -1.5, 'manual');
    expect(kindOf(selectInteractionTargetAll(ORIGIN, 0, [s], [p], []))).toBe('station:arcade');
    expect(kindOf(selectInteractionTargetAll(ORIGIN, 0, [], [p, q], []))).toBe('prop:manual-maze');
    expect(kindOf(selectInteractionTargetAll(ORIGIN, 0, [], [q, p], []))).toBe('prop:manual-snake');
  });

  it('returns the same Station as selectInteractionStation when there are no props', () => {
    for (const [pos, yaw] of [
      [{ x: 0, z: -0.5 }, 0],
      [{ x: 7.2, z: -1.2 }, -Math.PI / 2],
      [{ x: 7.2, z: 0 }, -Math.PI / 2],
      [{ x: 7.2, z: 1.2 }, -Math.PI / 2],
      [ROOM.start, ROOM.startYaw],
    ] as const) {
      const all = selectInteractionTargetAll(pos, yaw, STATION_DEFS, [], COLLIDERS);
      const one = selectInteractionStation(pos, yaw, STATION_DEFS, COLLIDERS);
      expect(all === null ? null : all.type === 'station' ? all.station : 'prop').toBe(one);
    }
  });
});

describe('room layout interactables (task 23.2)', () => {
  const cells = reachableCells(ROOM.start);
  const reachable = (x: number, z: number) => cells.some((c) => Math.abs(c.x - x) < 1e-6 && Math.abs(c.z - z) < 1e-6);
  const pick = (pos: { x: number; z: number }, yaw: number) => selectInteractionTargetAll(pos, yaw, STATION_DEFS, INTERACTABLE_DEFS, COLLIDERS);
  const propId = (t: ReturnType<typeof pick>) => (t?.type === 'prop' ? t.prop.id : null);
  const stationId = (t: ReturnType<typeof pick>) => (t?.type === 'station' ? t.station.id : null);

  it('declares two lamps and three manuals, non-solid, range 2.2, never Stations', () => {
    expect(INTERACTABLE_DEFS.map((d) => d.id)).toEqual(['desk-lamp-left', 'desk-lamp-right', 'manual-snake', 'manual-maze', 'manual-frequency']);
    for (const d of INTERACTABLE_DEFS) {
      expect(d.range).toBe(2.2);
      expect(STATION_DEFS.some((s) => (s.id as string) === d.id)).toBe(false);
    }
  });

  it.each([
    ['manual-snake', 1.4],
    ['manual-maze', 1.8],
    ['manual-frequency', 2.2],
  ] as const)('%s is selected from the reachable cell (-3.8, %s) looking west', (id, z) => {
    expect(reachable(-3.8, z)).toBe(true);
    const def = INTERACTABLE_DEFS.find((d) => d.id === id)!;
    expect(Math.hypot(def.anchor.x + 3.8, def.anchor.z - z)).toBeLessThanOrEqual(2.2);
    expect(propId(pick({ x: -3.8, z }, Math.PI / 2))).toBe(id);
  });

  it.each([
    ['desk-lamp-left', -1.27],
    ['desk-lamp-right', 1.27],
  ] as const)('%s is selected from the reachable cell north of the desk and from the south side', (id, x) => {
    const xs = Math.round(x * 10) / 10;
    expect(reachable(xs, 0.6)).toBe(true);
    expect(propId(pick({ x: xs, z: 0.6 }, Math.PI))).toBe(id);
    expect(reachable(xs, 2.6)).toBe(true);
    expect(propId(pick({ x: xs, z: 2.6 }, 0))).toBe(id);
    // Beyond 2.2 m the lamp is not selectable.
    expect(propId(pick({ x: xs, z: 1.45 - 2.3 }, Math.PI))).toBeNull();
  });

  it('keeps the existing station positions selecting their stations', () => {
    expect(stationId(pick({ x: 0, z: -0.5 }, 0))).toBe('vhs');
    expect(stationId(pick({ x: 0, z: 0.4 }, 0))).toBe('vhs');
    // In front of the console looking back toward the desk: the lamps are more than 2.2 m away.
    expect(pick({ x: 0, z: -0.5 }, Math.PI)).toBeNull();
    expect(pick({ x: 0, z: -1.0 }, Math.PI)).toBeNull();
    for (const z of [-1.2, 0, 1.2]) {
      const t = pick({ x: 7.2, z }, -Math.PI / 2);
      expect(t?.type === 'station' ? t.station.anchor.z : null).toBeCloseTo(z);
    }
  });
});
