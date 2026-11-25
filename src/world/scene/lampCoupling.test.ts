import { describe, expect, it } from 'vitest'
import { AMBIENT_INTENSITY_FLOOR, PALETTE_NORMAL } from '../logic/palette'
import { LAMP_LIGHT_FACTOR_TABLE, countLampsOn, lampLightFactors } from './lampCoupling'
import { applyShift, POINT_LIGHT_SHIFTED_SCALE, type ShiftTargets } from './memoryShift'

class FakeColor {
  hex = ''
  set(c: string) {
    this.hex = c
  }
}

function makeTargets(): ShiftTargets & { ambient: { color: FakeColor; intensity: number } } {
  return {
    background: new FakeColor(),
    fog: { color: new FakeColor(), near: 0, far: 0 },
    ambient: { color: new FakeColor(), intensity: 0 },
    points: [
      { light: { color: new FakeColor(), intensity: 0 }, baseColor: '#4fe0d0', baseIntensity: 6 }, // crt-light, never coupled
      { light: { color: new FakeColor(), intensity: 0 }, baseColor: '#ffb766', baseIntensity: 6, lampCoupled: true }, // west-light
      { light: { color: new FakeColor(), intensity: 0 }, baseColor: '#9a6ae0', baseIntensity: 5 }, // arcade-light
    ],
    wall: { color: new FakeColor() },
    screens: [],
    overlays: [],
  } as never
}

describe('task 24.1: lampLightFactors', () => {
  it('has 2 lamps ON as the neutral baseline (1.0), so the mount look is unchanged', () => {
    expect(lampLightFactors(2)).toEqual({ ambient: 1, west: 1 })
  })

  it('is monotonic: fewer lamps ON never brightens the room, and 0 is the dimmest', () => {
    const f = [0, 1, 2].map(lampLightFactors)
    for (let i = 1; i < f.length; i++) {
      expect(f[i].ambient).toBeGreaterThanOrEqual(f[i - 1].ambient)
      expect(f[i].west).toBeGreaterThanOrEqual(f[i - 1].west)
    }
    expect(f[0].west).toBeLessThan(f[2].west)
    expect(f[0].ambient).toBeLessThan(f[2].ambient)
    // Modest: never below 70 % of the baseline.
    for (const x of LAMP_LIGHT_FACTOR_TABLE) {
      expect(x.ambient).toBeGreaterThan(0.7)
      expect(x.west).toBeGreaterThan(0.7)
    }
  })

  it('clamps and rounds out-of-range counts and treats non-finite input as the mount state', () => {
    expect(lampLightFactors(-3)).toBe(LAMP_LIGHT_FACTOR_TABLE[0])
    expect(lampLightFactors(9)).toBe(LAMP_LIGHT_FACTOR_TABLE[2])
    expect(lampLightFactors(Number.NaN)).toBe(LAMP_LIGHT_FACTOR_TABLE[2])
  })

  it('counts lamps ON, treating a missing entry as ON', () => {
    const ids = ['a', 'b']
    expect(countLampsOn(undefined, ids)).toBe(2)
    expect(countLampsOn({ a: false }, ids)).toBe(1)
    expect(countLampsOn({ a: false, b: false }, ids)).toBe(0)
    expect(countLampsOn({ a: true, b: true }, ids)).toBe(2)
  })
})

describe('task 24.1: applying the lamp factors in applyShift', () => {
  it('default (no factors) equals both lamps ON, and 2 lamps ON changes nothing', () => {
    for (const t of [0, 0.4, 1]) {
      const a = makeTargets()
      const b = makeTargets()
      applyShift(t, a)
      applyShift(t, b, lampLightFactors(2))
      expect(b.ambient.intensity).toBe(a.ambient.intensity)
      expect(b.points.map((p) => p.light.intensity)).toEqual(a.points.map((p) => p.light.intensity))
    }
  })

  it('multiplies ambient and west-light after the blend and leaves crt-light and arcade-light alone', () => {
    for (const t of [0, 0.5, 1]) {
      const base = makeTargets()
      applyShift(t, base)
      for (const n of [0, 1]) {
        const f = lampLightFactors(n)
        const x = makeTargets()
        applyShift(t, x, f)
        expect(x.points[0].light.intensity).toBe(base.points[0].light.intensity)
        expect(x.points[2].light.intensity).toBe(base.points[2].light.intensity)
        expect(x.points[1].light.intensity).toBeCloseTo(base.points[1].light.intensity * f.west, 9)
        expect(x.ambient.intensity).toBeCloseTo(Math.max(AMBIENT_INTENSITY_FLOOR, base.ambient.intensity * f.ambient), 9)
        // The Memory_Shift scale still composes: west at t = 1 is base * shifted scale * factor.
        if (t === 1) expect(x.points[1].light.intensity).toBeCloseTo(6 * POINT_LIGHT_SHIFTED_SCALE * f.west, 9)
      }
    }
  })

  it('keeps ambient at or above the floor for every blend value and lamp count', () => {
    for (let i = 0; i <= 20; i++) {
      for (const n of [0, 1, 2]) {
        const x = makeTargets()
        applyShift(i / 20, x, lampLightFactors(n))
        expect(x.ambient.intensity).toBeGreaterThanOrEqual(AMBIENT_INTENSITY_FLOOR)
      }
    }
    // Even a hostile factor cannot break the floor.
    const y = makeTargets()
    applyShift(1, y, { ambient: 0.01, west: 0.01 })
    expect(y.ambient.intensity).toBe(AMBIENT_INTENSITY_FLOOR)
  })

  it('does not accumulate over repeated frames and returns to the same values when lamps come back ON', () => {
    const x = makeTargets()
    applyShift(0.3, x, lampLightFactors(0))
    const first = [x.ambient.intensity, ...x.points.map((p) => p.light.intensity)]
    for (let i = 0; i < 200; i++) applyShift(0.3, x, lampLightFactors(0))
    expect([x.ambient.intensity, ...x.points.map((p) => p.light.intensity)]).toEqual(first)
    applyShift(0.3, x, lampLightFactors(2))
    const neutral = makeTargets()
    applyShift(0.3, neutral)
    expect(x.ambient.intensity).toBe(neutral.ambient.intensity)
    expect(x.points[1].light.intensity).toBe(neutral.points[1].light.intensity)
    expect(PALETTE_NORMAL.ambientIntensity * lampLightFactors(0).ambient).toBeGreaterThan(AMBIENT_INTENSITY_FLOOR)
  })
})
