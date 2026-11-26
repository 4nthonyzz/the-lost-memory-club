/**
 * Room light coupling (task 24.1). Pure, no three.js or React. The number of desk lamps that are ON scales the
 * ambient and west-light intensities a little, so switching a lamp off visibly dims the archive room.
 *
 * Baseline choice: the mount state has both lamps ON, so 2 lamps ON is the neutral factor 1.0 and the default look
 * is unchanged. Turning lamps off dims the room: 1 ON is slightly lower, 0 ON is lower again.
 *
 * The factors are multipliers applied by `applyShift` AFTER the Memory_Shift blend, always computed from the
 * authored base values (never from the light's current intensity), so they cannot accumulate frame over frame.
 * crt-light (owned by the Effects flicker) and arcade-light are never touched.
 */

export const DESK_LAMP_COUNT = 2

export interface LampLightFactors {
  /** Multiplier on the blended ambient intensity (the ambient floor still applies afterwards). */
  ambient: number
  /** Multiplier on the west-light (warm archive light) intensity. */
  west: number
}

/** Factor table indexed by the number of lamps ON (0, 1, 2). */
export const LAMP_LIGHT_FACTOR_TABLE: readonly LampLightFactors[] = Object.freeze([
  Object.freeze({ ambient: 0.9, west: 0.75 }),
  Object.freeze({ ambient: 0.95, west: 0.88 }),
  Object.freeze({ ambient: 1, west: 1 }),
])

/** Factors for `onCount` lamps ON. Non-finite input is treated as the mount state; the count is clamped to 0..2. */
export function lampLightFactors(onCount: number): LampLightFactors {
  if (!Number.isFinite(onCount)) return LAMP_LIGHT_FACTOR_TABLE[DESK_LAMP_COUNT]
  const n = Math.min(DESK_LAMP_COUNT, Math.max(0, Math.round(onCount)))
  return LAMP_LIGHT_FACTOR_TABLE[n]
}

/** Number of lamps ON from the world-local state. A lamp absent from the record is ON (the mount default). */
export function countLampsOn(lampOn: Readonly<Record<string, boolean>> | undefined, ids: readonly string[]): number {
  return ids.reduce((n, id) => n + ((lampOn?.[id] ?? true) ? 1 : 0), 0)
}
