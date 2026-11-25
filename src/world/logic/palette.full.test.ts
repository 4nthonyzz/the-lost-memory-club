import { describe, expect, it } from 'vitest'
import {
  AMBIENT_INTENSITY_FLOOR,
  PALETTE_NORMAL,
  PALETTE_SHIFTED,
  advanceProgress,
  blendPalette,
  countDirectionChanges,
  flickerFactor,
  transitionProgress,
} from './palette'

describe('transitionProgress', () => {
  it('is linear over 2 s and clamped', () => {
    expect(transitionProgress(0, false)).toBe(0)
    expect(transitionProgress(1, false)).toBeCloseTo(0.5)
    expect(transitionProgress(2, false)).toBe(1)
    expect(transitionProgress(3, false)).toBe(1)
    expect(transitionProgress(100, false)).toBe(1)
  })
  it('returns 0 for NaN or negative elapsed', () => {
    expect(transitionProgress(NaN, false)).toBe(0)
    expect(transitionProgress(-1, false)).toBe(0)
  })
  it('completes immediately under reduced motion', () => {
    expect(transitionProgress(0, true)).toBe(1)
    expect(transitionProgress(NaN, true)).toBe(1)
  })
})

describe('advanceProgress', () => {
  it('reaches 1 within 3 s at 60 fps and returns to 0 in reverse', () => {
    let t = 0
    for (let i = 0; i < 180; i++) t = advanceProgress(t, 1 / 60, 1, false)
    expect(t).toBe(1)
    for (let i = 0; i < 180; i++) t = advanceProgress(t, 1 / 60, 0, false)
    expect(t).toBe(0)
  })
  it('jumps to target under reduced motion', () => {
    expect(advanceProgress(0, 0.016, 1, true)).toBe(1)
    expect(advanceProgress(1, 0.016, 0, true)).toBe(0)
  })
  it('ignores invalid dt and caps large dt', () => {
    expect(advanceProgress(0.5, NaN, 1, false)).toBe(0.5)
    expect(advanceProgress(0.5, -1, 1, false)).toBe(0.5)
    expect(advanceProgress(0, 10, 1, false)).toBeCloseTo(0.125)
  })
})

describe('blendPalette', () => {
  it('equals the source palettes at the endpoints', () => {
    expect(blendPalette(PALETTE_NORMAL, PALETTE_SHIFTED, 0)).toEqual(PALETTE_NORMAL)
    expect(blendPalette(PALETTE_NORMAL, PALETTE_SHIFTED, 1)).toEqual(PALETTE_SHIFTED)
  })
  it('clamps t and keeps valid hex colors', () => {
    expect(blendPalette(PALETTE_NORMAL, PALETTE_SHIFTED, -5)).toEqual(PALETTE_NORMAL)
    expect(blendPalette(PALETTE_NORMAL, PALETTE_SHIFTED, 9)).toEqual(PALETTE_SHIFTED)
    const mid = blendPalette(PALETTE_NORMAL, PALETTE_SHIFTED, 0.5)
    for (const c of [mid.background, mid.ambient, mid.lightColor, mid.fogColor, mid.wallTint, mid.screenEmissive, mid.accent]) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
  it('keeps the ambient floor for every t, even with low source intensities', () => {
    const low = { ...PALETTE_NORMAL, ambientIntensity: 0 }
    for (let i = -2; i <= 102; i++) {
      const t = i / 100
      expect(blendPalette(PALETTE_NORMAL, PALETTE_SHIFTED, t).ambientIntensity).toBeGreaterThanOrEqual(AMBIENT_INTENSITY_FLOOR)
      expect(blendPalette(low, low, t).ambientIntensity).toBeGreaterThanOrEqual(AMBIENT_INTENSITY_FLOOR)
    }
  })
})

describe('flickerFactor', () => {
  it('stays within [0.85, 1.15] and changes direction at most 3 times per rolling second', () => {
    const step = 0.001
    const samples: number[] = []
    for (let i = 0; i <= 20000; i++) {
      const v = flickerFactor(i * step, false)
      expect(v).toBeGreaterThanOrEqual(0.85)
      expect(v).toBeLessThanOrEqual(1.15)
      samples.push(v)
    }
    const per = 1000
    for (let start = 0; start + per < samples.length; start += 50) {
      expect(countDirectionChanges(samples.slice(start, start + per + 1))).toBeLessThanOrEqual(3)
    }
  })
  it('is constant 1 under reduced motion', () => {
    for (let i = 0; i < 100; i++) expect(flickerFactor(i * 0.137, true)).toBe(1)
  })
  it('returns 1 for non-finite time', () => {
    expect(flickerFactor(NaN, false)).toBe(1)
  })
})

describe('countDirectionChanges', () => {
  it('counts extrema and ignores flat runs', () => {
    expect(countDirectionChanges([0, 1, 1, 0, 1])).toBe(2)
    expect(countDirectionChanges([1, 1, 1])).toBe(0)
  })
})
