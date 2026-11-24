import { describe, expect, it, vi } from 'vitest'
import { COLLIDERS, ROOM, STATION_DEFS } from '../layout/roomLayout'
import { M3_LIGHT_COUNT } from './Lighting'
import {
  GEOMETRY_TRIANGLES,
  MAX_LIGHTS,
  SCENE_TRIANGLE_BUDGET,
  TAPE_PALETTE,
  arcadeCabinetParts,
  armchairParts,
  couchParts,
  crateParts,
  crtScreenRect,
  crtTelevisionParts,
  declaredObjects,
  sceneDetailReport,
  shelfTapes,
  vcrDeckParts,
  type Part,
} from './modelDetail'
import { disposeSharedResources, geometries, materials } from './sharedResources'

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
    expect(report.totalTriangles).toBeLessThan(SCENE_TRIANGLE_BUDGET)
    expect(report.totalTriangles).toBeGreaterThan(report.baseTriangles)
  })

  it('keeps draw calls moderate (instanced groups, not one per primitive)', () => {
    const primitives = declaredObjects().reduce((n, o) => n + o.parts.length, 0)
    expect(report.totalDrawCalls).toBeLessThan(primitives)
    expect(report.totalDrawCalls).toBeLessThan(400)
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
    expect(STATION_DEFS.find((s) => s.id === 'arcade')).toMatchObject({ anchor: { x: 2.5, z: arcade.box.maxZ }, collider: arcade.box })
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
    expect(arcadeCabinetParts(a.box, a.height).filter((p) => p.mat === 'arcadeScreen')).toHaveLength(1)
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
    check(arcadeCabinetParts(arcade.box, arcade.height), arcade.box)
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
