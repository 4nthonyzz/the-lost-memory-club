import { describe, expect, it } from 'vitest'
import {
  AMBIENT_INTENSITY_FLOOR,
  PALETTE_NORMAL,
  PALETTE_SHIFTED,
  paletteFor,
} from './palette'

describe('palette (M1)', () => {
  it('differs in background and ambient color', () => {
    expect(PALETTE_NORMAL.background).not.toBe(PALETTE_SHIFTED.background)
    expect(PALETTE_NORMAL.ambient).not.toBe(PALETTE_SHIFTED.ambient)
  })

  it('keeps ambient intensity at or above the floor in both palettes', () => {
    expect(PALETTE_NORMAL.ambientIntensity).toBeGreaterThanOrEqual(AMBIENT_INTENSITY_FLOOR)
    expect(PALETTE_SHIFTED.ambientIntensity).toBeGreaterThanOrEqual(AMBIENT_INTENSITY_FLOOR)
  })

  it('uses hex color strings', () => {
    for (const p of [PALETTE_NORMAL, PALETTE_SHIFTED]) {
      expect(p.background).toMatch(/^#[0-9a-f]{6}$/i)
      expect(p.ambient).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('selects the palette from the memoryShifted boolean', () => {
    expect(paletteFor(false)).toBe(PALETTE_NORMAL)
    expect(paletteFor(true)).toBe(PALETTE_SHIFTED)
  })
})
