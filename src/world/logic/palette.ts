// Minimal palette (M1): background and ambient only. Pure module, derived only from
// the memoryShifted boolean. Blending, transition and flicker are added in task 11.1.

export interface Palette {
  /** Scene background color, hex string. */
  background: string
  /** Ambient light color, hex string. */
  ambient: string
  /** Ambient light intensity, never below AMBIENT_INTENSITY_FLOOR. */
  ambientIntensity: number
}

/** Minimum ambient intensity so floor, walls and Stations stay readable (Req 10.7). */
export const AMBIENT_INTENSITY_FLOOR = 0.35

export const PALETTE_NORMAL: Palette = {
  background: '#0b1230',
  ambient: '#6f8fd8',
  ambientIntensity: 0.6,
}

export const PALETTE_SHIFTED: Palette = {
  background: '#2a0a14',
  ambient: '#d86f86',
  ambientIntensity: 0.55,
}

export function paletteFor(memoryShifted: boolean): Palette {
  return memoryShifted ? PALETTE_SHIFTED : PALETTE_NORMAL
}
