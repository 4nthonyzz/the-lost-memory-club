import { afterEach, describe, expect, it, vi } from 'vitest'
import { COLLIDERS, ROOM, STATION_DEFS } from '../layout/roomLayout'
import { M3_LIGHT_COUNT } from './Lighting'
import {
  GEOMETRY_TRIANGLES,
  MAX_LIGHTS,
  SCENE_TRIANGLE_BUDGET,
  TAPE_PALETTE,
  arcadeCabinetParts,
  arcadeFloorParts,
  arcadeSignBodyParts,
  arcadeSignLetterParts,
  arcadeSignParts,
  armchairParts,
  crtStackParts,
  couchParts,
  crateParts,
  crtScreenRect,
  crtTelevisionParts,
  declaredObjects,
  posterParts,
  sceneDetailReport,
  shelfTapes,
  vcrDeckParts,
  type Part,
} from './modelDetail'
import { facingFrame } from './assetPlacement'
import { TEXTURE_IDS, TEXTURE_MEMORY_BUDGET_BYTES, TEXTURE_SPECS, totalTextureMemoryBytes } from './proceduralTextures'
import { fakeCanvas } from './recordingContext'
import {
  SHARED_TEXTURE_IDS,
  disposeSharedResources,
  ensureSharedTextures,
  geometries,
  getSharedTexture,
  liveTextureCount,
  materials,
  setCanvasFactory,
} from './sharedResources'

const lightingSource = (
  import.meta.glob('./Lighting.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
)['./Lighting.tsx']

const prop = (id: string) => {
  const p = ROOM.props.find((q) => q.id === id)
  if (!p) throw new Error(id)
  return p
}

describe('geometry triangle table', () => {
  it('matches the real shared geometries', () => {
    for (const [key, g] of Object.entries(geometries)) {
      const tris = (g.index ? g.index.count : g.getAttribute('position').count) / 3
      expect(GEOMETRY_TRIANGLES[key as keyof typeof geometries]).toBe(tris)
    }
  })
})

describe('scene detail budget', () => {
  const report = sceneDetailReport()

  it('stays under 20,000 triangles', () => {
    console.info(
      `[15.7] computed triangles: ${report.totalTriangles} (detail ${report.detailTriangles} + base ${report.baseTriangles}), ` +
        `draw-call estimate (grouped by geometry+material): ${report.totalDrawCalls}, tapes ${report.tapeCount}, ` +
        `textures ${report.textureCount}, texture memory estimate ${(report.textureMemoryBytes / 1048576).toFixed(2)} MB`,
    )
    expect(report.totalTriangles).toBeLessThan(SCENE_TRIANGLE_BUDGET)
    expect(report.totalTriangles).toBeGreaterThan(report.baseTriangles)
  })

  it('keeps draw calls moderate (instanced groups, not one per primitive)', () => {
    const primitives = declaredObjects().reduce((n, o) => n + o.parts.length, 0)
    expect(report.totalDrawCalls).toBeLessThan(primitives)
    expect(report.totalDrawCalls).toBeLessThan(400)
  })

  it('texture memory estimate is within 8 MB and matches the specs', () => {
    expect(report.textureCount).toBe(TEXTURE_IDS.length)
    expect(report.textureMemoryBytes).toBe(totalTextureMemoryBytes())
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(TEXTURE_MEMORY_BUDGET_BYTES)
  })

  it('declares at most 4 lights, and fluorescent fixtures are not lights', () => {
    expect(M3_LIGHT_COUNT).toBeLessThanOrEqual(MAX_LIGHTS)
    const lights = (lightingSource.match(/<(ambientLight|pointLight|directionalLight|spotLight|hemisphereLight)\b/g) ?? []).length
    expect(lights).toBeLessThanOrEqual(MAX_LIGHTS)
    expect(lights).toBe(M3_LIGHT_COUNT)
    expect(materials.fluorescent.type).toBe('MeshBasicMaterial')
  })
})

describe('layout stays the single source of truth', () => {
  it('colliders are exactly walls + door frames + solid props', () => {
    const solid = ROOM.props.filter((p) => p.solid).map((p) => p.box)
    const expected = [...ROOM.walls, ...ROOM.doors.flatMap((d) => d.frames), ...solid]
    expect(COLLIDERS).toEqual(expected)
    expect(COLLIDERS.length).toBe(ROOM.walls.length + 4 + solid.length)
  })

  it('station anchors sit on the front of the station prop footprints', () => {
    const crt = prop('crt-vhs')
    const arcade = prop('arcade-cabinet')
    expect(STATION_DEFS.find((s) => s.id === 'vhs')).toMatchObject({ anchor: { x: -2.5, z: crt.box.maxZ }, collider: crt.box })
    // The arcade cabinet faces west: its anchor is centred on the west face (minX).
    expect(STATION_DEFS.find((s) => s.id === 'arcade')).toMatchObject({
      anchor: { x: arcade.box.minX, z: (arcade.box.minZ + arcade.box.maxZ) / 2 },
      collider: arcade.box,
      facing: '-x',
    })
  })

  it('the CRT screen part matches the placement Effects.tsx uses', () => {
    const crt = prop('crt-vhs')
    const w = crt.box.maxX - crt.box.minX
    const crtH = crt.height - 0.6
    const rect = crtScreenRect(crt.box, crt.height)
    expect([...rect.position]).toEqual([
      (crt.box.minX + crt.box.maxX) / 2 - 0.05,
      0.6 + crtH / 2,
      crt.box.maxZ + 0.005,
    ])
    expect([...rect.scale]).toEqual([w * 0.6, crtH * 0.7, 1])
    const screens = crtTelevisionParts(crt.box, crt.height).filter((p) => p.mat === 'crtScreen')
    expect(screens).toHaveLength(1)
    expect([...screens[0].pos]).toEqual([...rect.position])
    expect([...screens[0].scale]).toEqual([...rect.scale])
  })

  it('arcade screen is a single fixed arcadeScreen plane', () => {
    const a = prop('arcade-cabinet')
    const local = facingFrame(a.box, a.facing).local
    expect(arcadeCabinetParts(local, a.height).filter((p) => p.mat === 'arcadeScreen')).toHaveLength(1)
  })

  it('companion cabinet is powered down: dark screen and marquee, no arcadeScreen or lit marquee', () => {
    const c = prop('arcade-companion')
    const parts = arcadeCabinetParts(facingFrame(c.box, c.facing).local, c.height, false)
    expect(parts.some((p) => p.mat === 'arcadeScreen' || p.mat === 'marquee')).toBe(false)
    expect(parts.filter((p) => p.mat === 'screenOff')).toHaveLength(1)
    expect(parts.filter((p) => p.mat === 'marqueeOff')).toHaveLength(1)
    expect(materials.screenOff.type).toBe('MeshLambertMaterial')
  })

  it('ARCADE sign uses emissive basic materials, spells six letters and sits above the doors', () => {
    expect(materials.signText.type).toBe('MeshBasicMaterial')
    expect(materials.signGlow.type).toBe('MeshBasicMaterial')
    const sign = prop('arcade-sign')
    const parts = arcadeSignParts()
    expect(parts.length).toBe(arcadeSignBodyParts().length + arcadeSignLetterParts().length)
    expect(arcadeSignLetterParts().length).toBeGreaterThanOrEqual(6 * 3)
    for (const p of parts) {
      expect(p.pos[1] - p.scale[1] / 2).toBeGreaterThanOrEqual((sign.elevation ?? 0) - 0.2)
      expect(p.pos[1]).toBeLessThanOrEqual((sign.elevation ?? 0) + sign.height + 0.01)
      expect(p.pos[2]).toBeGreaterThanOrEqual(sign.box.minZ)
      expect(p.pos[2]).toBeLessThanOrEqual(sign.box.maxZ)
      expect(p.pos[0]).toBeLessThanOrEqual(sign.box.maxX)
    }
  })

  it('crt stack, floor runner and cables are counted and stay on their layout footprints', () => {
    const names = declaredObjects().map((o) => o.name)
    for (const n of ['arcade-companion', 'crt-stack', 'arcade-sign', 'arcade-floor']) expect(names).toContain(n)
    const stack = prop('crt-stack')
    const local = facingFrame(stack.box, stack.facing).local
    const parts = crtStackParts(local, stack.height)
    expect(parts.filter((p) => p.mat === 'screenOff')).toHaveLength(3)
    for (const p of parts) {
      if (p.geo === 'plane') continue
      expect(p.pos[1] + p.scale[1] / 2).toBeLessThanOrEqual(stack.height + 1e-6)
    }
    const floor = arcadeFloorParts()
    expect(floor.filter((p) => p.geo === 'plane')).toHaveLength(1)
    expect(floor.filter((p) => p.geo === 'box')).toHaveLength(2)
  })

  it('facingFrame swaps width and depth for sideways facings and keeps the world footprint', () => {
    const a = prop('arcade-cabinet')
    const f = facingFrame(a.box, '-x')
    expect(f.position).toEqual([(a.box.minX + a.box.maxX) / 2, 0, 0])
    expect(f.rotationY).toBeCloseTo(-Math.PI / 2)
    expect(f.local.maxX - f.local.minX).toBeCloseTo(a.box.maxZ - a.box.minZ)
    expect(f.local.maxZ - f.local.minZ).toBeCloseTo(a.box.maxX - a.box.minX)
    // The local front (+Z) lands on the west face (minX) after the rotation.
    const lx = 0
    const lz = f.local.maxZ
    const wx = f.position[0] + lx * Math.cos(f.rotationY) + lz * Math.sin(f.rotationY)
    expect(wx).toBeCloseTo(a.box.minX)
  })

  it('arcade cabinet has six coloured buttons, a ball-top joystick and a marquee', () => {
    const a = prop('arcade-cabinet')
    const parts = arcadeCabinetParts(a.box, a.height)
    const buttons = parts.filter((p) => /^btn/.test(p.mat) && p.geo === 'cylinder')
    expect(new Set(buttons.map((p) => p.mat)).size).toBe(6)
    expect(parts.filter((p) => p.geo === 'sphere')).toHaveLength(1)
    expect(parts.filter((p) => p.mat === 'marquee')).toHaveLength(1)
  })

  it('unrotated parts stay near their layout footprints', () => {
    const tol = 0.12
    const check = (parts: Part[], box: { minX: number; maxX: number; minZ: number; maxZ: number }, front = 0.08) => {
      for (const p of parts) {
        if (p.rot || p.geo === 'plane') continue
        expect(p.pos[0] - p.scale[0] / 2).toBeGreaterThanOrEqual(box.minX - tol)
        expect(p.pos[0] + p.scale[0] / 2).toBeLessThanOrEqual(box.maxX + tol)
        expect(p.pos[2] - p.scale[2] / 2).toBeGreaterThanOrEqual(box.minZ - tol)
        expect(p.pos[2] + p.scale[2] / 2).toBeLessThanOrEqual(box.maxZ + front + 1e-6)
      }
    }
    const crt = prop('crt-vhs')
    const arcade = prop('arcade-cabinet')
    check(crtTelevisionParts(crt.box, crt.height), crt.box)
    check(vcrDeckParts(crt.box), crt.box)
    // Arcade parts are built in the local frame (front toward +Z), then rotated by the group.
    const arcadeLocal = facingFrame(arcade.box, arcade.facing).local
    check(arcadeCabinetParts(arcadeLocal, arcade.height), arcadeLocal)
    check(armchairParts(prop('abandoned-chair').box), prop('abandoned-chair').box)
    check(couchParts(prop('couch').box), prop('couch').box)
    check(crateParts(prop('crate-a').box, 0.6), prop('crate-a').box)
  })
})

describe('shelf tapes', () => {
  const shelf = prop('shelf-a')

  it('are deterministic for the same id and layout', () => {
    expect(shelfTapes('shelf-a', shelf.box)).toEqual(shelfTapes('shelf-a', shelf.box))
  })

  it('use varied palette colours and valid palette indices', () => {
    const tapes = shelfTapes('shelf-a', shelf.box)
    expect(tapes.length).toBeGreaterThan(40)
    const used = new Set(tapes.map((t) => t.paletteIndex))
    expect(used.size).toBeGreaterThan(4)
    for (const i of used) expect(i).toBeLessThan(TAPE_PALETTE.length)
  })

  it('differ between shelves', () => {
    const b = prop('shelf-b')
    expect(shelfTapes('shelf-b', b.box).map((t) => t.paletteIndex)).not.toEqual(
      shelfTapes('shelf-a', shelf.box).map((t) => t.paletteIndex),
    )
  })

  it('stay inside the shelf footprint', () => {
    for (const id of ['shelf-a', 'shelf-b', 'shelf-c']) {
      const p = prop(id)
      for (const t of shelfTapes(id, p.box)) {
        expect(t.pos[0]).toBeGreaterThan(p.box.minX)
        expect(t.pos[0]).toBeLessThan(p.box.maxX)
        expect(t.pos[2]).toBeGreaterThan(p.box.minZ)
        expect(t.pos[2]).toBeLessThan(p.box.maxZ)
      }
    }
  })
})

describe('disposeSharedResources', () => {
  it('disposes every shared geometry and material', () => {
    const geoSpies = Object.values(geometries).map((g) => vi.spyOn(g, 'dispose'))
    const matSpies = Object.values(materials).map((m) => vi.spyOn(m, 'dispose'))
    disposeSharedResources()
    for (const s of [...geoSpies, ...matSpies]) expect(s).toHaveBeenCalledTimes(1)
  })

  it('every material and geometry key used by declared parts exists', () => {
    for (const o of declaredObjects()) {
      for (const p of o.parts) {
        expect(geometries[p.geo]).toBeDefined()
        expect(materials[p.mat]).toBeDefined()
      }
    }
  })
})

describe('procedural textures in the shared resources', () => {
  afterEach(() => setCanvasFactory(null))

  it('without a canvas (node, jsdom) no texture is created and materials stay flat', () => {
    setCanvasFactory(null)
    ensureSharedTextures()
    expect(liveTextureCount()).toBe(0)
    expect(getSharedTexture('floor')).toBeNull()
    expect(materials.floor.map).toBeNull()
    expect(materials.arcadeScreen.map).toBeNull()
  })

  it('creates every texture once, as sRGB, and attaches them to the materials', () => {
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    ensureSharedTextures()
    expect(liveTextureCount()).toBe(TEXTURE_IDS.length)
    expect(SHARED_TEXTURE_IDS).toEqual(TEXTURE_IDS)
    for (const id of TEXTURE_IDS) {
      const t = getSharedTexture(id)
      expect(t).not.toBeNull()
      expect(t?.colorSpace).toBe('srgb')
      expect(t?.image.width).toBe(TEXTURE_SPECS[id].width)
      expect(t?.image.height).toBe(TEXTURE_SPECS[id].height)
    }
    // The arcade screen stays one shared material; memoryShift only tints its colour.
    expect(materials.arcadeScreen.map).toBe(getSharedTexture('arcadeScreen'))
    expect(materials.arcadeScreen.color.getHexString()).toBe('ffffff')
    expect(getSharedTexture('arcadeScreen')?.magFilter).toBe(1003) // NearestFilter
    expect(materials.floor.map).toBe(getSharedTexture('floor'))
    const repeat = getSharedTexture('floor')?.repeat
    expect(repeat?.x).toBeCloseTo((ROOM.bounds.maxX - ROOM.bounds.minX) / 2)
    expect(repeat?.y).toBeCloseTo((ROOM.bounds.maxZ - ROOM.bounds.minZ) / 2)
    // Overlays stay transparent, hidden and fade-ready.
    for (const m of [materials.shiftPoster, materials.shiftPlaque]) {
      expect(m.map).not.toBeNull()
      expect(m.transparent).toBe(true)
      expect(m.opacity).toBe(0)
      expect(m.visible).toBe(false)
    }
  })

  it('disposes each texture exactly once, and a second dispose is safe', () => {
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    const spies = TEXTURE_IDS.map((id) => vi.spyOn(getSharedTexture(id)!, 'dispose'))
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(liveTextureCount()).toBe(0)
    expect(materials.arcadeScreen.map).toBeNull()
    expect(() => disposeSharedResources()).not.toThrow()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
  })

  it('rebuilds fresh textures after a dispose so a remount works', () => {
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    const before = getSharedTexture('marquee')
    disposeSharedResources()
    ensureSharedTextures()
    const after = getSharedTexture('marquee')
    expect(after).not.toBeNull()
    expect(after).not.toBe(before)
    expect(materials.marquee.map).toBe(after)
    expect(liveTextureCount()).toBe(TEXTURE_IDS.length)
  })

  it('a canvas without a 2D context yields no texture', () => {
    setCanvasFactory(() => ({ width: 0, height: 0, getContext: () => null }))
    ensureSharedTextures()
    expect(liveTextureCount()).toBe(0)
    expect(materials.floor.map).toBeNull()
  })
})

describe('silhouette refinements', () => {
  it('arcade cabinet has a stepped side wing, a screen hood, a coin-return glow and grilles', () => {
    const a = prop('arcade-cabinet')
    const parts = arcadeCabinetParts(facingFrame(a.box, a.facing).local, a.height)
    expect(parts.filter((p) => p.mat === 'coinGlow')).toHaveLength(1)
    expect(parts.filter((p) => p.mat === 'grille').length).toBeGreaterThanOrEqual(2)
    expect(parts.filter((p) => p.mat === 'deck')).toHaveLength(1)
    // Four wing boxes per side (one lower, three upper steps) that get shorter toward the back.
    const wings = parts.filter((p) => p.mat === 'cabinet' && p.geo === 'box' && Math.abs(p.scale[0] - 0.03) < 1e-9 && p.pos[0] > 0.5)
    expect(wings).toHaveLength(4)
    const depths = wings.slice(1).map((p) => p.scale[2])
    expect([...depths].sort((x, y) => y - x)).toEqual(depths)
    expect(new Set(depths).size).toBe(3)
    // Hood: three cabinet boxes in front of the arcadeScreen plane.
    const screen = parts.find((p) => p.mat === 'arcadeScreen')!
    const hood = parts.filter((p) => p.mat === 'cabinet' && p.geo === 'box' && p.pos[2] > screen.pos[2] && p.pos[1] > 1.2 && p.pos[1] < 1.7 && !p.rot)
    expect(hood.length).toBeGreaterThanOrEqual(3)
  })

  it('powered-down companion cabinet has no coin glow', () => {
    const c = prop('arcade-companion')
    const parts = arcadeCabinetParts(facingFrame(c.box, c.facing).local, c.height, false)
    expect(parts.some((p) => p.mat === 'coinGlow')).toBe(false)
  })

  it('desk has a mug, a notepad and three loose tapes; chairs have rolled arms and a pillow', () => {
    const d = prop('reception-desk')
    const desk = declaredObjects().find((o) => o.name === 'desk')!.parts
    expect(desk.filter((p) => p.mat === 'mug').length).toBeGreaterThanOrEqual(2)
    expect(desk.filter((p) => p.mat === 'paper')).toHaveLength(1)
    expect(desk.filter((p) => p.mat === 'tapeBlack').length).toBeGreaterThanOrEqual(3)
    expect(d.height).toBe(1)
    expect(armchairParts(prop('abandoned-chair').box).filter((p) => p.geo === 'cylinderLow' && p.mat === 'fabric').length).toBeGreaterThanOrEqual(3)
    expect(couchParts(prop('couch').box).filter((p) => p.geo === 'cylinderLow').length).toBeGreaterThanOrEqual(5)
  })

  it('framed posters are textured planes with four frame boxes each, on the poster props', () => {
    const parts = posterParts()
    expect(parts.filter((p) => p.geo === 'plane').map((p) => p.mat)).toEqual(['posterSunset', 'posterReel'])
    expect(parts.filter((p) => p.mat === 'woodDark')).toHaveLength(8)
    const north = prop('poster-north')
    const plane = parts.find((p) => p.mat === 'posterSunset')!
    expect(plane.pos[0]).toBeCloseTo((north.box.minX + north.box.maxX) / 2)
    expect(plane.pos[2]).toBeCloseTo(north.box.maxZ + 0.005)
  })

  it('crates keep their ribs and slats and gain a diagonal brace', () => {
    const c = prop('crate-a')
    const parts = crateParts(c.box, c.height)
    expect(parts.filter((p) => p.mat === 'crate').length).toBeGreaterThanOrEqual(4)
    expect(parts.filter((p) => p.mat === 'crateSlat').length).toBeGreaterThanOrEqual(6)
    expect(parts.some((p) => p.rot && p.mat === 'crateSlat')).toBe(true)
  })
})
