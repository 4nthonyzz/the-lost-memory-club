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
  const pick = (pos: { x: number; z: number }, yaw: number, shifted = false) =>
    selectInteractionTargetAll(pos, yaw, STATION_DEFS, INTERACTABLE_DEFS, COLLIDERS, undefined, shifted);
  const propId = (t: ReturnType<typeof pick>) => (t?.type === 'prop' ? t.prop.id : null);
  const stationId = (t: ReturnType<typeof pick>) => (t?.type === 'station' ? t.station.id : null);

  it('declares nine interactables (two lamps, three manuals, notebook, cork board, shift poster, archive notice), range 2.2, never Stations', () => {
    expect(INTERACTABLE_DEFS.map((d) => d.id)).toEqual([
      'desk-lamp-left',
      'desk-lamp-right',
      'manual-snake',
      'manual-maze',
      'manual-frequency',
      'desk-notebook',
      'cork-board',
      'poster-shift',
      'poster-archive',
    ]);
    expect(INTERACTABLE_DEFS.filter((d) => d.requiresShift).map((d) => d.id)).toEqual(['poster-shift']);
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

  it('places the protruding manual anchors at x -4.52, 0.035 m in front of the spine face, with a line-of-sight box equal to the book volume (task 28.2)', () => {
    const manuals = INTERACTABLE_DEFS.filter((d) => d.kind === 'manual');
    expect(manuals.map((d) => [d.anchor.x, d.anchor.z])).toEqual([
      [-4.52, 1.4],
      [-4.52, 1.8],
      [-4.52, 2.2],
    ]);
    for (const d of manuals) {
      expect(d.collider!.maxX).toBeCloseTo(-4.555, 9);
      expect(d.collider!.minX).toBeCloseTo(-4.845, 9);
      expect(d.collider!.maxZ - d.collider!.minZ).toBeCloseTo(0.085, 9);
      expect((d.collider!.minZ + d.collider!.maxZ) / 2).toBeCloseTo(d.anchor.z, 9);
      // The books are not colliders, and the anchor is outside every solid footprint, so no collider hides it from the aisle.
      expect(COLLIDERS).not.toContain(d.collider);
      expect(COLLIDERS.some((c) => d.anchor.x >= c.minX && d.anchor.x <= c.maxX && d.anchor.z >= c.minZ && d.anchor.z <= c.maxZ)).toBe(false);
      expect(COLLIDERS.some((c) => segmentIntersectsAabb({ x: -3.8, z: d.anchor.z }, d.anchor, c))).toBe(false);
    }
  });

  it('the middle manual wins from the middle cell and stations and other props do not take over', () => {
    expect(reachable(-3.8, 1.8)).toBe(true);
    const t = pick({ x: -3.8, z: 1.8 }, Math.PI / 2);
    expect(propId(t)).toBe('manual-maze');
    expect(stationId(t)).toBeNull();
    // Aiming from the cells next to the end manuals picks them, not the middle one.
    expect(propId(pick({ x: -3.8, z: 1.4 }, Math.PI / 2))).toBe('manual-snake');
    expect(propId(pick({ x: -3.8, z: 2.2 }, Math.PI / 2))).toBe('manual-frequency');
    // Looking away (east) selects none of them.
    expect(propId(pick({ x: -3.8, z: 1.8 }, -Math.PI / 2))).not.toBe('manual-maze');
  });

  it.each([
    ['desk-lamp-left', -1.27],
    ['desk-lamp-right', 1.27],
  ] as const)('%s is selected from the reachable cell north of the desk and from the south side', (id, x) => {
    const xs = Math.round(x * 10) / 10;
    expect(reachable(xs, 0.6)).toBe(true);
    expect(propId(pick({ x: xs, z: 0.6 }, Math.PI))).toBe(id);
    // Desk side. The desk notebook is nearer than the left lamp from (-1.3, 2.6), so the left lamp is aimed at from the west end of the desk.
    const south = id === 'desk-lamp-left' ? { x: -1.9, z: 1.6, yaw: -Math.PI / 2 } : { x: xs, z: 2.6, yaw: 0 };
    expect(reachable(south.x, south.z)).toBe(true);
    expect(propId(pick(south, south.yaw))).toBe(id);
    // Beyond 2.2 m the lamp is not selectable.
    expect(propId(pick({ x: xs, z: 1.45 - 2.3 }, Math.PI))).toBeNull();
  });

  it('keeps the existing station positions selecting their stations', () => {
    expect(stationId(pick({ x: 0, z: -0.5 }, 0))).toBe('vhs');
    expect(stationId(pick({ x: 0, z: 0.4 }, 0))).toBe('vhs');
    // In front of the console looking back toward the desk: the lamps are more than 2.2 m away. The notebook (moved to (-0.58, 1.62) in 25.1)
    // is just inside the 2.2 m range from the console front (2.198 m), so it is the only target there.
    expect(propId(pick({ x: 0, z: -0.5 }, Math.PI))).toBe('desk-notebook');
    expect(pick({ x: 0, z: -1.0 }, Math.PI)).toBeNull();
    for (const z of [-1.2, 0, 1.2]) {
      const t = pick({ x: 7.2, z }, -Math.PI / 2);
      expect(t?.type === 'station' ? t.station.anchor.z : null).toBeCloseTo(z);
    }
  });
});

describe('readable notes in the room layout (task 24.2)', () => {
  const cells = reachableCells(ROOM.start);
  const reachable = (x: number, z: number) => cells.some((c) => Math.abs(c.x - x) < 1e-6 && Math.abs(c.z - z) < 1e-6);
  const pick = (pos: { x: number; z: number }, yaw: number, shifted = false) =>
    selectInteractionTargetAll(pos, yaw, STATION_DEFS, INTERACTABLE_DEFS, COLLIDERS, undefined, shifted);
  const label = (t: ReturnType<typeof pick>) => (t === null ? null : t.type === 'prop' ? t.prop.id : `station:${t.station.id}`);
  const def = (id: string) => INTERACTABLE_DEFS.find((d) => d.id === id)!;

  it('places the anchors on the notebook, the bulletin board and the shift poster', () => {
    expect(def('desk-notebook').anchor).toEqual({ x: expect.closeTo(-0.58, 9), z: expect.closeTo(1.62, 9) });
    expect(def('cork-board').anchor.x).toBeCloseTo(-2.25, 9);
    expect(def('cork-board').anchor.z).toBe(-3.95);
    expect(def('poster-shift').anchor).toEqual({ x: -0.3, z: -3.94 });
    expect(def('desk-notebook').kind).toBe('note');
  });

  it.each([
    ['desk-notebook', { x: -0.9, z: 2.6 }, 0, false],
    ['cork-board', { x: -2.2, z: -3.0 }, 0, false],
    ['poster-shift', { x: -0.3, z: -3.0 }, 0, true],
  ] as const)('%s is selected from a reachable cell within 2.2 m', (id, pos, yaw, shifted) => {
    expect(reachable(pos.x, pos.z)).toBe(true);
    const a = def(id).anchor;
    expect(Math.hypot(a.x - pos.x, a.z - pos.z)).toBeLessThanOrEqual(2.2);
    expect(label(pick(pos, yaw, shifted))).toBe(id);
  });

  it('25.1: the notebook no longer steals the left lamp from the front or the back of the desk', () => {
    // South of the desk (yaw 0 looks toward -z) near x -1.3, and a cell on the old notebook line (x -0.95).
    for (const pos of [{ x: -1.3, z: 2.6 }, { x: -1.5, z: 2.6 }, { x: -1.3, z: 2.4 }]) {
      expect(reachable(pos.x, pos.z), `${pos.x},${pos.z}`).toBe(true);
      expect(label(pick(pos, 0))).toBe('desk-lamp-left');
    }
    // North of the desk looking south (yaw PI), also near x -1.3.
    const north = { x: -1.3, z: 0.6 };
    expect(reachable(north.x, north.z)).toBe(true);
    expect(label(pick(north, Math.PI))).toBe('desk-lamp-left');
    // The old notebook anchor (-0.95, 1.7) is no longer the anchor.
    expect(def('desk-notebook').anchor).not.toEqual({ x: -0.95, z: 1.7 });
  });

  it('25.1: aiming at the notebook from in front of it selects the notebook', () => {
    const pos = { x: -0.6, z: 2.6 };
    expect(reachable(pos.x, pos.z)).toBe(true);
    expect(label(pick(pos, 0))).toBe('desk-notebook');
    expect(def('desk-notebook').anchor).toEqual({ x: expect.closeTo(-0.58, 9), z: expect.closeTo(1.62, 9) });
  });

  it('the poster is targetable only while the room is shifted', () => {
    const pos = { x: -0.3, z: -3.0 };
    expect(label(pick(pos, 0, false))).toBeNull();
    expect(label(pick(pos, 0, true))).toBe('poster-shift');
    // The default (flag omitted) is not shifted.
    expect(selectInteractionTargetAll(pos, 0, STATION_DEFS, INTERACTABLE_DEFS, COLLIDERS)).toBeNull();
  });

  it('the new notes do not steal Station targets where a Station is nearer', () => {
    expect(label(pick({ x: 0, z: -0.5 }, 0, true))).toBe('station:vhs');
    expect(label(pick({ x: 0, z: 0.4 }, 0, true))).toBe('station:vhs');
    for (const z of [-1.2, 0, 1.2]) {
      const t = pick({ x: 7.2, z }, -Math.PI / 2, true);
      expect(t?.type === 'station' ? t.station.anchor.z : null).toBeCloseTo(z);
    }
    // Every reachable cell with a Station target from the old rules still gets a Station: notes are never nearer there.
    const stationOnly = (pos: { x: number; z: number }, yaw: number) => selectInteractionTargetAll(pos, yaw, STATION_DEFS, [], COLLIDERS);
    for (const c of cells.filter((_, i) => i % 7 === 0)) {
      for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const s = stationOnly(c, yaw);
        if (s === null) continue;
        const all = pick(c, yaw, true);
        if (all?.type === 'prop') {
          const sa = (s as { type: 'station'; station: { anchor: { x: number; z: number } } }).station.anchor;
          const pa = all.prop.anchor;
          expect(Math.hypot(pa.x - c.x, pa.z - c.z)).toBeLessThan(Math.hypot(sa.x - c.x, sa.z - c.z));
        }
      }
    }
  });
});

describe('Club Archive Notice in the Arcade_Area (task 25.2)', () => {
  const cells = reachableCells(ROOM.start);
  const reachable = (x: number, z: number) => cells.some((c) => Math.abs(c.x - x) < 1e-6 && Math.abs(c.z - z) < 1e-6);
  const pick = (pos: { x: number; z: number }, yaw: number, shifted = false) =>
    selectInteractionTargetAll(pos, yaw, STATION_DEFS, INTERACTABLE_DEFS, COLLIDERS, undefined, shifted);
  const label = (t: ReturnType<typeof pick>) => (t === null ? null : t.type === 'prop' ? t.prop.id : `station:${t.station.id}`);
  const def = INTERACTABLE_DEFS.find((d) => d.id === 'poster-archive')!;

  it('is anchored at the real position of the poster-arcade-area prop, 0.02 m into the room, and is not a Memory_Shift overlay', () => {
    const poster = ROOM.props.find((p) => p.id === 'poster-arcade-area')!;
    expect(def.anchor.x).toBeCloseTo((poster.box.minX + poster.box.maxX) / 2, 9);
    expect(def.anchor.z).toBeCloseTo(poster.box.maxZ + 0.02, 9);
    expect(def.collider).toEqual(poster.box);
    expect(def.kind).toBe('note');
    expect(def.range).toBe(2.2);
    expect(def.requiresShift).toBeUndefined();
    expect(poster.solid).toBe(false);
  });

  it.each([
    [{ x: 7.5, z: -0.5 }, 0],
    [{ x: 7.5, z: -0.2 }, 0],
    [{ x: 6.8, z: -0.4 }, -0.4],
  ] as const)('is selected from the reachable cell %j within 2.2 m, shifted or not', (pos, yaw) => {
    expect(reachable(pos.x, pos.z)).toBe(true);
    expect(Math.hypot(def.anchor.x - pos.x, def.anchor.z - pos.z)).toBeLessThanOrEqual(2.2);
    expect(label(pick(pos, yaw, false))).toBe('poster-archive');
    expect(label(pick(pos, yaw, true))).toBe('poster-archive');
  });

  it('is not selected beyond 2.2 m', () => {
    // (6, 0.6) is 2.94 m from the notice; aim straight at it.
    expect(reachable(6, 0.6)).toBe(true);
    expect(label(pick({ x: 6, z: 0.6 }, -0.53))).toBeNull();
  });

  it('does not steal the arcade stations from the cells in front of the cabinets, nor the vhs station and the lamps', () => {
    for (const z of [-1.2, 0, 1.2]) {
      expect(reachable(7.2, z)).toBe(true);
      for (const shifted of [false, true]) {
        const t = pick({ x: 7.2, z }, -Math.PI / 2, shifted);
        expect(t?.type === 'station' ? t.station.anchor.z : null).toBeCloseTo(z);
      }
    }
    expect(label(pick({ x: 0, z: -0.5 }, 0))).toBe('station:vhs');
    expect(label(pick({ x: -1.3, z: 0.6 }, Math.PI))).toBe('desk-lamp-left');
    expect(label(pick({ x: 1.3, z: 2.6 }, 0))).toBe('desk-lamp-right');
  });
});