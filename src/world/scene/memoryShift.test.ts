import { describe, expect, it } from 'vitest'
import { AMBIENT_INTENSITY_FLOOR, PALETTE_NORMAL, PALETTE_SHIFTED } from '../logic/palette'
import {
  BASE_ARCADE_SCREEN_COLOR,
  BASE_CRT_SCREEN_COLOR,
  BASE_WALL_COLOR,
  applyShift,
  mixHex,
  overlayOpacity,
  overlayVisible,
  wallShiftColor,
  type ShiftTargets,
} from './memoryShift'
import { WALL_TEXTURE_ALBEDO } from './proceduralTextures'

class FakeColor {
  hex = ''
  set(c: string) {
    this.hex = c
  }
}

function makeTargets() {
  const targets = {
    background: new FakeColor(),
    fog: { color: new FakeColor(), near: 0, far: 0 },
    ambient: { color: new FakeColor(), intensity: 0 },
    points: [{ light: { color: new FakeColor(), intensity: 0 }, baseColor: '#4fe0d0', baseIntensity: 6 }],
    wall: { color: new FakeColor() },
    screens: [
      { material: { color: new FakeColor() }, baseColor: BASE_CRT_SCREEN_COLOR },
      { material: { color: new FakeColor() }, baseColor: BASE_ARCADE_SCREEN_COLOR },
    ],
    overlays: [{ material: { opacity: 0, visible: false }, maxOpacity: 0.9 }],
  }
  return targets satisfies ShiftTargets
}

function snapshot(t: ReturnType<typeof makeTargets>) {
  return {
    background: t.background.hex,
    fog: [t.fog.color.hex, t.fog.near, t.fog.far],
    ambient: [t.ambient.color.hex, t.ambient.intensity],
    point: [t.points[0].light.color.hex, t.points[0].light.intensity],
    wall: t.wall.color.hex,
    crt: t.screens[0].material.color.hex,
    arcade: t.screens[1].material.color.hex,
    overlay: [t.overlays[0].material.opacity, t.overlays[0].material.visible],
  }
}

describe('applyShift', () => {
  it('t = 0 restores the original look with hidden overlays', () => {
    const t = makeTargets()
    applyShift(1, t)
    applyShift(0, t)
    const s = snapshot(t)
    expect(s.background).toBe(PALETTE_NORMAL.background)
    expect(s.fog).toEqual([PALETTE_NORMAL.fogColor, PALETTE_NORMAL.fogNear, PALETTE_NORMAL.fogFar])
    expect(s.wall).toBe(BASE_WALL_COLOR)
    expect(s.crt).toBe(BASE_CRT_SCREEN_COLOR)
    expect(s.arcade).toBe(BASE_ARCADE_SCREEN_COLOR)
    expect(s.point).toEqual(['#4fe0d0', 6])
    expect(s.overlay).toEqual([0, false])
  })

  it('t = 1 differs from t = 0 in at least four visual properties', () => {
    const a = makeTargets()
    const b = makeTargets()
    applyShift(0, a)
    applyShift(1, b)
    const sa = snapshot(a)
    const sb = snapshot(b)
    const differing = (Object.keys(sa) as Array<keyof typeof sa>).filter(
      (k) => JSON.stringify(sa[k]) !== JSON.stringify(sb[k]),
    )
    expect(differing.length).toBeGreaterThanOrEqual(4)
    expect(sb.background).toBe(PALETTE_SHIFTED.background)
    expect(sb.overlay).toEqual([0.9, true])
  })

  it('keeps ambient intensity at or above the floor for every t', () => {
    const t = makeTargets()
    for (let i = 0; i <= 20; i++) {
      applyShift(i / 20, t)
      expect(t.ambient.intensity).toBeGreaterThanOrEqual(AMBIENT_INTENSITY_FLOOR)
    }
  })

  it('treats the arcade screen like the CRT screen: only t changes it', () => {
    const a = makeTargets()
    const b = makeTargets()
    applyShift(0.5, a)
    applyShift(0.5, b)
    expect(a.screens[1].material.color.hex).toBe(b.screens[1].material.color.hex)
  })

  it('textured arcade screen: white base shows the map unmodified at t = 0 and tints at t = 1', () => {
    expect(BASE_ARCADE_SCREEN_COLOR).toBe('#ffffff')
    const t = makeTargets()
    applyShift(0, t)
    expect(t.screens[1].material.color.hex).toBe('#ffffff')
    applyShift(1, t)
    expect(t.screens[1].material.color.hex).toBe(PALETTE_SHIFTED.screenEmissive)
    applyShift(0.5, t)
    expect(t.screens[1].material.color.hex).not.toBe('#ffffff')
  })

  it('textured wall: near-white multiplier at t = 0, the shifted wall tint is reached at t = 1 through the baked albedo', () => {
    const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    for (const ch of channels(BASE_WALL_COLOR)) expect(ch).toBeGreaterThanOrEqual(0xe0)
    const t = makeTargets()
    applyShift(0, t)
    expect(t.wall.color.hex).toBe(BASE_WALL_COLOR)
    applyShift(1, t)
    expect(t.wall.color.hex).toBe(wallShiftColor())
    // multiplier x albedo ~ PALETTE_SHIFTED.wallTint wherever the multiplier is not clamped
    const mult = channels(wallShiftColor())
    const tint = channels(PALETTE_SHIFTED.wallTint)
    mult.forEach((m, i) => {
      if (m < 255) expect(Math.abs(m * WALL_TEXTURE_ALBEDO[i] - tint[i])).toBeLessThanOrEqual(1)
    })
    applyShift(0.5, t)
    expect(t.wall.color.hex).not.toBe(BASE_WALL_COLOR)
  })

  it('clamps invalid t', () => {
    const t = makeTargets()
    applyShift(Number.NaN, t)
    expect(t.background.hex).toBe(PALETTE_NORMAL.background)
    applyShift(5, t)
    expect(t.background.hex).toBe(PALETTE_SHIFTED.background)
  })
})

describe('overlay rules', () => {
  it('is invisible at t = 0 and fades linearly', () => {
    expect(overlayVisible(0)).toBe(false)
    expect(overlayVisible(0.01)).toBe(true)
    expect(overlayOpacity(0)).toBe(0)
    expect(overlayOpacity(0.5, 0.8)).toBeCloseTo(0.4)
    expect(overlayOpacity(2, 0.8)).toBe(0.8)
  })
})

describe('mixHex', () => {
  it('returns the endpoints and a midpoint', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
  })
})
