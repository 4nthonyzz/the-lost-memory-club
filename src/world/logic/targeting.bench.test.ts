import { describe, expect, it } from 'vitest';
import { COLLIDERS, ROOM, STATION_DEFS, reachableCells } from '../layout/roomLayout';
import { selectInteractionTarget } from './targeting';

/**
 * Targeting benchmark (Requirements 14.8, 14.9, 14.11). It prints the measured
 * numbers and asserts only functional invariants. There is no time threshold
 * because the result depends on the hardware that runs the test.
 */
const CALLS = 20_000;
const YAW_COUNT = 16;

describe('selectInteractionTarget benchmark (informational)', () => {
  it(`times ${CALLS} calls over the full layout without asserting speed`, () => {
    const cells = reachableCells(ROOM.start);
    expect(cells.length).toBeGreaterThan(0);

    const stride = Math.max(1, Math.floor(cells.length / 250));
    const grid = cells.filter((_, i) => i % stride === 0);
    const valid = new Set<string | null>([null, ...STATION_DEFS.map((s) => s.id)]);

    let completed = 0;
    let hits = 0;
    let invalid = 0;
    const t0 = performance.now();
    for (let n = 0; n < CALLS; n++) {
      const cell = grid[n % grid.length];
      const yaw = ((Math.floor(n / grid.length) % YAW_COUNT) / YAW_COUNT) * Math.PI * 2;
      const result = selectInteractionTarget(cell, yaw, STATION_DEFS, COLLIDERS);
      if (!valid.has(result)) invalid++;
      if (result !== null) hits++;
      completed++;
    }
    const elapsedMs = performance.now() - t0;

    console.info(
      `[targeting bench] method: performance.now around ${CALLS} calls, ${grid.length} reachable cells x ${YAW_COUNT} yaws, ` +
        `${STATION_DEFS.length} stations, ${COLLIDERS.length} colliders. ` +
        `measured total ${elapsedMs.toFixed(2)} ms; computed ${((elapsedMs * 1000) / CALLS).toFixed(3)} us/call; ` +
        `${hits} calls returned a station. No threshold applied.`,
    );

    expect(completed).toBe(CALLS);
    expect(invalid).toBe(0);
  });
});
