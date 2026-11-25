import { describe, expect, it } from 'vitest'
import { AMBIENT_INTENSITY_FLOOR, PALETTE_NORMAL, PALETTE_SHIFTED } from '../logic/palette'
import {
  ARCADE_SCREEN_BASE_COLORS,
  BASE_ARCADE_SCREEN_COLOR,
  BASE_CRT_SCREEN_COLOR,
  BASE_WALL_COLOR,
  COUCH_FABRIC_COLORS,
  applyShift,
  couchBaseColor,
  couchShiftColor,
  crtScreenBaseColor,
  arcadeScreenBaseColor,
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
      { material: { color: new FakeColor() }, baseColor: ARCADE_SCREEN_BASE_COLORS.snake },
      { material: { color: new FakeColor() }, baseColor: ARCADE_SCREEN_BASE_COLORS.maze },
      { material: { color: new FakeColor() }, baseColor: ARCADE_SCREEN_BASE_COLORS.frequency },
    ],
    overlays: [{ material: { opacity: 0, visible: false }, maxOpacity: 0.9 }],
    couch: [
      { material: { color: new FakeColor() }, baseColor: COUCH_FABRIC_COLORS.couchBody.flat },
      { material: { color: new FakeColor() }, baseColor: COUCH_FABRIC_COLORS.couchCushion.flat },
      { material: { color: new FakeColor() }, baseColor: COUCH_FABRIC_COLORS.couchPillow.flat },
    ],
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
    arcade: [t.screens[1].material.color.hex, t.screens[2].material.color.hex, t.screens[3].material.color.hex],
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
    expect(s.arcade).toEqual([ARCADE_SCREEN_BASE_COLORS.snake, ARCADE_SCREEN_BASE_COLORS.maze, ARCADE_SCREEN_BASE_COLORS.frequency])
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

  it('all three cabinet screens: authored colour at t = 0, shifted colour at t = 1, a mix in between (flat fallback)', () => {
    const bases = Object.values(ARCADE_SCREEN_BASE_COLORS)
    expect(new Set(bases).size).toBe(3)
    const t = makeTargets()
    applyShift(0, t)
    bases.forEach((c, i) => expect(t.screens[i + 1].material.color.hex).toBe(c))
    applyShift(1, t)
    for (const i of [1, 2, 3]) expect(t.screens[i].material.color.hex).toBe(PALETTE_SHIFTED.screenEmissive)
    applyShift(0.5, t)
    bases.forEach((c, i) => expect(t.screens[i + 1].material.color.hex).not.toBe(c))
    applyShift(0, t)
    bases.forEach((c, i) => expect(t.screens[i + 1].material.color.hex).toBe(c))
  })

  it('textured screens: the base is white, so t = 0 restores it exactly and the shift still tints all three', () => {
    expect(BASE_ARCADE_SCREEN_COLOR).toBe('#ffffff')
    const games = ['snake', 'maze', 'frequency'] as const
    for (const g of games) {
      expect(arcadeScreenBaseColor(g, true)).toBe('#ffffff')
      expect(arcadeScreenBaseColor(g, false)).toBe(ARCADE_SCREEN_BASE_COLORS[g])
    }
    const t = makeTargets()
    t.screens.slice(1).forEach((s, i) => (s.baseColor = arcadeScreenBaseColor(games[i], true)))
    applyShift(0, t)
    for (const i of [1, 2, 3]) expect(t.screens[i].material.color.hex).toBe('#ffffff')
    applyShift(1, t)
    for (const i of [1, 2, 3]) expect(t.screens[i].material.color.hex).toBe(PALETTE_SHIFTED.screenEmissive)
    applyShift(0.5, t)
    for (const i of [1, 2, 3]) expect(t.screens[i].material.color.hex).not.toBe('#ffffff')
    applyShift(0, t)
    for (const i of [1, 2, 3]) expect(t.screens[i].material.color.hex).toBe('#ffffff')
  })

  it('CRT glass (task 21.2): white base while textured, exact flat base without a texture, tinted at t = 1', () => {
    expect(crtScreenBaseColor(true)).toBe('#ffffff')
    expect(crtScreenBaseColor(false)).toBe(BASE_CRT_SCREEN_COLOR)
    // Textured.
    const t = makeTargets()
    t.screens[0].baseColor = crtScreenBaseColor(true)
    applyShift(0, t)
    expect(t.screens[0].material.color.hex).toBe('#ffffff')
    applyShift(1, t)
    expect(t.screens[0].material.color.hex).toBe(PALETTE_SHIFTED.screenEmissive)
    applyShift(0.5, t)
    expect(t.screens[0].material.color.hex).toBe(mixHex('#ffffff', PALETTE_SHIFTED.screenEmissive, 0.5))
    applyShift(0, t)
    expect(t.screens[0].material.color.hex).toBe('#ffffff')
    // Flat fallback.
    const f = makeTargets()
    f.screens[0].baseColor = crtScreenBaseColor(false)
    applyShift(0, f)
    expect(f.screens[0].material.color.hex).toBe(BASE_CRT_SCREEN_COLOR)
    applyShift(1, f)
    expect(f.screens[0].material.color.hex).toBe(PALETTE_SHIFTED.screenEmissive)
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

  it('couch upholstery: exact authored colour at t = 0, a darker duller tone at t = 1, a mix at t = 0.5 (flat and textured bases)', () => {
    const lum = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).reduce((a, b) => a + b, 0)
    const keys = ['couchBody', 'couchCushion', 'couchPillow'] as const
    for (const textured of [false, true]) {
      const t = makeTargets()
      t.couch.forEach((s, i) => (s.baseColor = couchBaseColor(keys[i], textured)))
      applyShift(1, t)
      applyShift(0, t)
      t.couch.forEach((s, i) => expect(s.material.color.hex).toBe(couchBaseColor(keys[i], textured)))
      applyShift(1, t)
      t.couch.forEach((s) => {
        expect(s.material.color.hex).toBe(couchShiftColor(s.baseColor))
        expect(s.material.color.hex).not.toBe(s.baseColor)
        expect(lum(s.material.color.hex)).toBeLessThan(lum(s.baseColor))
      })
      applyShift(0.5, t)
      t.couch.forEach((s) => {
        const mid = s.material.color.hex
        expect(mid).toBe(mixHex(s.baseColor, couchShiftColor(s.baseColor), 0.5))
        expect(lum(mid)).toBeLessThan(lum(s.baseColor))
        expect(lum(mid)).toBeGreaterThan(lum(couchShiftColor(s.baseColor)))
      })
      applyShift(0, t)
      t.couch.forEach((s, i) => expect(s.material.color.hex).toBe(couchBaseColor(keys[i], textured)))
    }
  })

  it('targets without couch entries still shift everything else', () => {
    const t = makeTargets() as ShiftTargets
    delete t.couch
    applyShift(1, t)
    expect(t.wall.color).toBeDefined()
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

describe('task 22.1: armchair upholstery tint', () => {
  const keys = ['armchairBody', 'armchairCushion'] as const
  const lum = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).reduce((a, b) => a + b, 0)
  const targets = (textured: boolean) =>
    keys.map((k) => ({ material: { color: new FakeColor() }, baseColor: couchBaseColor(k, textured) }))

  it('keeps the previous green armchair colours as the flat fallback and a lifted slate/teal when textured', () => {
    expect(COUCH_FABRIC_COLORS.armchairBody.flat).toBe('#3d5a4c')
    expect(COUCH_FABRIC_COLORS.armchairCushion.flat).toBe('#4f7561')
    expect(COUCH_FABRIC_COLORS.armchairBody.textured).toBe('#63848c')
    expect(COUCH_FABRIC_COLORS.armchairCushion.textured).toBe('#779ba0')
    for (const k of keys) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(COUCH_FABRIC_COLORS[k].textured.slice(i, i + 2), 16))
      expect(b).toBeGreaterThanOrEqual(r) // teal/slate: blue not below red
      expect(g).toBeGreaterThan(r)
    }
  })

  it.each([false, true])('t = 0 is exactly the base, t = 1 darker and duller, t = 0.5 between (textured: %s)', (textured) => {
    const list = targets(textured)
    const t = makeTargets()
    t.couch = list
    applyShift(0, t)
    list.forEach((s) => expect(s.material.color.hex).toBe(s.baseColor))
    applyShift(1, t)
    list.forEach((s) => {
      expect(s.material.color.hex).toBe(couchShiftColor(s.baseColor))
      expect(lum(s.material.color.hex)).toBeLessThan(lum(s.baseColor))
    })
    applyShift(0.5, t)
    list.forEach((s) => {
      const mid = s.material.color.hex
      expect(mid).toBe(mixHex(s.baseColor, couchShiftColor(s.baseColor), 0.5))
      expect(lum(mid)).toBeLessThan(lum(s.baseColor))
      expect(lum(mid)).toBeGreaterThan(lum(couchShiftColor(s.baseColor)))
    })
    applyShift(0, t)
    list.forEach((s) => expect(s.material.color.hex).toBe(s.baseColor))
  })
})