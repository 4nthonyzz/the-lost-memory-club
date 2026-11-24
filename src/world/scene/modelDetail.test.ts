import { afterEach, describe, expect, it, vi } from 'vitest'
import { Box3, Mesh, Object3D } from 'three'
import { COLLIDERS, ROOM, STATION_DEFS } from '../layout/roomLayout'
import { crtScreenPlacement } from './Effects'
import { CRT_LIGHT_POSITION, M3_LIGHT_COUNT } from './Lighting'
import {
  ARCHIVE_BOX_IDS,
  FILING_DRAWERS,
  WALL_PROTRUSION_LIMIT,
  archiveBoxParts,
  cableLoopParts,
  cableLoopsParts,
  conduitParts,
  cornerPostParts,
  deskLampGlowParts,
  deskLampParts,
  deskLampPosition,
  mainRoomBox,
  ventilationParts,
  wallClockParts,
  GEOMETRY_TRIANGLES,
  MAX_LIGHTS,
  SCENE_TRIANGLE_BUDGET,
  BOOK_HEIGHT_RANGE,
  BOOK_PALETTE,
  BOOK_THICKNESS_RANGE,
  LEAN_ANGLE_RANGE_DEG,
  SHELF_BOARD_T,
  SHELF_IDS,
  SHELF_LEVELS,
  SHELF_SIDE_T,
  SLIPCASE_DEPTH,
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
  CONSOLE_TOP,
  bulletinBoardParts,
  consoleTapeParts,
  crtScreenRect,
  filingCabinetParts,
  mediaConsoleParts,
  referenceMonitorParts,
  crtTelevisionParts,
  declaredObjects,
  posterParts,
  clampLeanHeight,
  leanFootprint,
  orientedHalfExtents,
  sceneDetailReport,
  shelfContents,
  shelfFrameParts,
  shelfGeometry,
  shelfInnerBounds,
  vcrDeckParts,
  type Part,
  type Vec3,
} from './modelDetail'
import { facingFrame } from './assetPlacement'
import {
  SPINE_BOOK_VARIANTS,
  SPINE_CASE_SIDE_CELL,
  SPINE_CASE_VARIANTS,
  SPINE_COVER_CELL,
  SPINE_VARIANT_COUNT,
  TEXTURE_IDS,
  TEXTURE_MEMORY_BUDGET_BYTES,
  TEXTURE_SPECS,
  spineCellUv,
  totalTextureMemoryBytes,
} from './proceduralTextures'
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
  spineGeometries,
  wallGeometry,
} from './sharedResources'
import { BASE_WALL_COLOR } from './memoryShift'

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
      `[18.2] computed triangles: ${report.totalTriangles} (detail ${report.detailTriangles} + base ${report.baseTriangles}), ` +
        `draw-call estimate (grouped by geometry+material): ${report.totalDrawCalls}, books ${report.bookCount}, slipcases ${report.tapeCount}, leaning ${report.leaningCount}, ` +
        `per shelf ${SHELF_IDS.map((id) => `${id}=${report.objects.find((o) => o.name === id)!.drawCalls} draws/${shelfContents(id, prop(id).box, prop(id).height).instances.length} books`).join(', ')}, ` +
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

  it('puts the crt-light above and in front of the island console', () => {
    const vhs = STATION_DEFS.find((s) => s.id === 'vhs')!
    expect([...CRT_LIGHT_POSITION]).toEqual([vhs.anchor.x, 1.6, vhs.anchor.z + 0.8])
    expect(lightingSource).toContain('name="crt-light"')
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
    expect(STATION_DEFS.find((s) => s.id === 'vhs')).toMatchObject({ anchor: { x: (crt.box.minX + crt.box.maxX) / 2, z: crt.box.maxZ }, collider: crt.box, facing: '+z' })
    // The arcade cabinet faces west: its anchor is centred on the west face (minX).
    expect(STATION_DEFS.find((s) => s.id === 'arcade')).toMatchObject({
      anchor: { x: arcade.box.minX, z: (arcade.box.minZ + arcade.box.maxZ) / 2 },
      collider: arcade.box,
      facing: '-x',
    })
  })

  it('the CRT screen part matches the placement Effects.tsx uses, derived from the island console', () => {
    const crt = prop('crt-vhs')
    const rect = crtScreenRect(crt.box, crt.height)
    // The television is 0.9 m wide, sits 0.3 m left of the console centre, 5 cm behind its front face, on top (0.7 m).
    const crtH = crt.height - CONSOLE_TOP
    expect(rect.position[0]).toBeCloseTo((crt.box.minX + crt.box.maxX) / 2 - 0.3 - 0.05)
    expect(rect.position[1]).toBeCloseTo(CONSOLE_TOP + crtH / 2)
    expect(rect.position[2]).toBeCloseTo(crt.box.maxZ - 0.05 + 0.005)
    expect(rect.scale[0]).toBeCloseTo(0.9 * 0.6)
    expect(rect.scale[1]).toBeCloseTo(crtH * 0.7)
    const screens = crtTelevisionParts(crt.box, crt.height).filter((p) => p.mat === 'crtScreen')
    expect(screens).toHaveLength(1)
    expect([...screens[0].pos]).toEqual([...rect.position])
    expect([...screens[0].scale]).toEqual([...rect.scale])
    // Effects.tsx uses the same rectangle, nudged 5 mm toward the player.
    const placement = crtScreenPlacement()!
    expect(placement.position[0]).toBeCloseTo(rect.position[0])
    expect(placement.position[1]).toBeCloseTo(rect.position[1])
    expect(placement.position[2]).toBeCloseTo(rect.position[2] + 0.005)
    expect(placement.scale).toEqual([...rect.scale])
    // The screen faces the spawn (south) and sits inside the console footprint along X.
    expect(rect.position[2]).toBeLessThanOrEqual(crt.box.maxZ)
    expect(rect.position[0]).toBeGreaterThan(crt.box.minX)
    expect(rect.position[0]).toBeLessThan(crt.box.maxX)
  })

  it('the island has a console with a VCR shelf, stacked tapes and a reference monitor on its own dim screen', () => {
    const crt = prop('crt-vhs')
    const names = declaredObjects().map((o) => o.name)
    for (const n of ['crt-television', 'vcr-deck', 'media-console', 'console-tapes', 'reference-monitor']) expect(names).toContain(n)
    const monitor = referenceMonitorParts(crt.box)
    expect(monitor.filter((p) => p.mat === 'screenOff')).toHaveLength(1)
    expect(monitor.some((p) => p.mat === 'crtScreen')).toBe(false)
    // Only the television carries the shared crtScreen plane.
    const all = [...mediaConsoleParts(crt.box), ...vcrDeckParts(crt.box), ...consoleTapeParts(crt.box), ...monitor]
    expect(all.some((p) => p.mat === 'crtScreen')).toBe(false)
    expect(consoleTapeParts(crt.box).filter((p) => p.mat === 'tapeBlack').length).toBeGreaterThanOrEqual(4)
    // The console top is at 0.7 m; the VCR stands on the lower shelf below it.
    const top = mediaConsoleParts(crt.box).find((p) => p.pos[1] > 0.65 && p.scale[0] > 1.8)!
    expect(top.pos[1] + top.scale[1] / 2).toBeCloseTo(CONSOLE_TOP)
    const vcr = vcrDeckParts(crt.box).find((p) => p.mat === 'plastic')!
    expect(vcr.pos[1] + vcr.scale[1] / 2).toBeLessThan(CONSOLE_TOP - 0.1)
  })

  it('filing cabinets and the bulletin board are declared placeholders on their layout props', () => {
    const names = declaredObjects().map((o) => o.name)
    for (const n of ['filing-cabinet-a', 'filing-cabinet-b', 'bulletin-board']) expect(names).toContain(n)
    const cab = prop('filing-cabinet-a')
    const parts = filingCabinetParts(cab.box, cab.height)
    expect(parts.filter((p) => p.mat === 'filingDark')).toHaveLength(4)
    for (const p of parts) expect(p.pos[1] + p.scale[1] / 2).toBeLessThanOrEqual(cab.height + 1e-6)
    const board = prop('bulletin-board')
    for (const p of bulletinBoardParts()) {
      expect(p.pos[1] - p.scale[1] / 2).toBeGreaterThanOrEqual((board.elevation ?? 0) - 1e-6)
      expect(p.pos[1] + p.scale[1] / 2).toBeLessThanOrEqual((board.elevation ?? 0) + board.height + 1e-6)
    }
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

describe('bookcase carcass', () => {
  it.each(SHELF_IDS)('%s is solid wood: thick sides, back, 4 boards, plinth and a stepped cornice, inside the footprint', (id) => {
    const p = prop(id)
    const parts = shelfFrameParts(p.box, p.height)
    const g = shelfGeometry(p.box, p.height)
    expect(parts.every((q) => q.geo === 'box' && (q.mat === 'wood' || q.mat === 'woodDark') && !q.rot)).toBe(true)
    expect(parts.length).toBe(13)
    // Boards: exactly four boxes 3 cm thick, one per level floor.
    const boards = parts.filter((q) => Math.abs(q.scale[1] - SHELF_BOARD_T) < 1e-9 && q.pos[1] > 0.12)
    expect(boards).toHaveLength(SHELF_LEVELS)
    boards.forEach((b, i) => expect(b.pos[1] + SHELF_BOARD_T / 2).toBeCloseTo(g.levels[i].floor))
    // Side panels: two tall boxes whose thickness along the shelf length is 4.5 cm.
    const lengthAxis = g.alongX ? 0 : 2
    const sides = parts.filter((q) => Math.abs(q.scale[lengthAxis] - SHELF_SIDE_T) < 1e-9 && q.scale[1] > 1.5)
    expect(sides).toHaveLength(2)
    expect(SHELF_SIDE_T).toBeGreaterThanOrEqual(0.04)
    expect(SHELF_SIDE_T).toBeLessThanOrEqual(0.05)
    // Cornice: three stacked steps above the body that reach exactly the prop height.
    const cornice = parts.filter((q) => q.pos[1] - q.scale[1] / 2 >= g.bodyTop - 1e-9)
    expect(cornice).toHaveLength(3)
    expect(Math.max(...parts.map((q) => q.pos[1] + q.scale[1] / 2))).toBeCloseTo(p.height)
    // Everything stays inside the layout footprint (the colliders are untouched).
    for (const q of parts) {
      expect(q.pos[0] - q.scale[0] / 2).toBeGreaterThanOrEqual(p.box.minX - 1e-9)
      expect(q.pos[0] + q.scale[0] / 2).toBeLessThanOrEqual(p.box.maxX + 1e-9)
      expect(q.pos[2] - q.scale[2] / 2).toBeGreaterThanOrEqual(p.box.minZ - 1e-9)
      expect(q.pos[2] + q.scale[2] / 2).toBeLessThanOrEqual(p.box.maxZ + 1e-9)
    }
  })

  it('opens away from the wall: the solid back panel is on the wall side', () => {
    for (const [id, wallSide] of [['shelf-a', 'west'], ['shelf-b', 'west'], ['shelf-c', 'south']] as const) {
      const p = prop(id)
      const back = shelfFrameParts(p.box, p.height).find((q) => q.mat === 'woodDark' && q.scale[1] > 1.5)!
      if (wallSide === 'west') expect(back.pos[0]).toBeLessThan((p.box.minX + p.box.maxX) / 2)
      else expect(back.pos[2]).toBeGreaterThan((p.box.minZ + p.box.maxZ) / 2)
    }
  })
})

describe('lean geometry', () => {
  it('footprint of a leaning book follows from the angle, and the height clamp keeps it under the ceiling', () => {
    const fp = leanFootprint(0.04, 0.25, 15)
    expect(fp.maxU).toBeCloseTo(0.25 * Math.sin(Math.PI / 12))
    expect(fp.minU).toBeCloseTo(-0.04 * Math.cos(Math.PI / 12))
    expect(fp.height).toBeCloseTo(0.25 * Math.cos(Math.PI / 12) + 0.04 * Math.sin(Math.PI / 12))
    for (const deg of [10, 14, 18]) {
      for (const t of [0.02, 0.05]) {
        const h = clampLeanHeight(t, deg, 0.3, 0.5)
        expect(leanFootprint(t, h, deg).height).toBeLessThanOrEqual(0.3 + 1e-9)
        // Short books are never changed.
        expect(clampLeanHeight(t, deg, 0.5, 0.2)).toBe(0.2)
      }
    }
  })

  it('orientedHalfExtents matches the world box of the instance matrix computed by three.js', () => {
    const size: [number, number, number] = [0.04, 0.25, 0.2]
    for (const rot of [[0, 0, 0], [0, Math.PI / 2, -0.26], [0, Math.PI, 0.3], [0, -Math.PI / 2 + 0.05, Math.PI / 2]] as const) {
      const o = new Object3D()
      o.position.set(1, 2, 3)
      o.rotation.set(rot[0], rot[1], rot[2])
      o.scale.set(...size)
      o.updateMatrix()
      const mesh = new Mesh(geometries.box)
      mesh.applyMatrix4(o.matrix)
      mesh.updateMatrixWorld(true)
      const box = new Box3().setFromObject(mesh)
      const half = orientedHalfExtents(size, rot)
      expect(box.max.x - 1).toBeCloseTo(half[0], 6)
      expect(box.max.y - 2).toBeCloseTo(half[1], 6)
      expect(box.max.z - 3).toBeCloseTo(half[2], 6)
    }
  })
})

describe('bookcase contents', () => {
  const bounds = (id: string) => {
    const p = prop(id)
    return { p, g: shelfGeometry(p.box, p.height), inner: shelfInnerBounds(p.box, p.height), c: shelfContents(id, p.box, p.height) }
  }

  it.each(SHELF_IDS)('%s is deterministic and differs from the other cases', (id) => {
    const p = prop(id)
    expect(shelfContents(id, p.box, p.height)).toEqual(shelfContents(id, p.box, p.height))
    const other = SHELF_IDS.find((s) => s !== id)!
    const q = prop(other)
    expect(shelfContents(other, q.box, q.height).instances.map((b) => b.colorIndex)).not.toEqual(
      shelfContents(id, p.box, p.height).instances.map((b) => b.colorIndex),
    )
  })

  it.each(SHELF_IDS)('%s is densely packed on every level with books and slipcases', (id) => {
    const { g, c } = bounds(id)
    expect(c.instances.length).toBeGreaterThanOrEqual(Math.floor(g.len * 12 * SHELF_LEVELS))
    for (let level = 0; level < SHELF_LEVELS; level++) {
      const row = c.instances.filter((b) => b.level === level)
      expect(row.length, `level ${level}`).toBeGreaterThanOrEqual(Math.floor(g.len * 8))
      expect(row.some((b) => b.kind === 'book')).toBe(true)
    }
    expect(c.instances.filter((b) => b.kind === 'slipcase' && b.group === 'row').length).toBeGreaterThan(10)
    expect(new Set(c.instances.filter((b) => b.kind === 'slipcase').map((b) => b.level)).size).toBeGreaterThanOrEqual(2)
    expect(c.instances.some((b) => b.kind === 'slipcase' && b.group === 'row')).toBe(true)
  })

  it.each(SHELF_IDS)('%s keeps every book, including leaning and stacked ones, inside the bookcase interior', (id) => {
    const { inner, c } = bounds(id)
    for (const b of c.instances) {
      const half = orientedHalfExtents(b.size, b.rot)
      const lv = inner.levels[b.level]
      const where = `${b.group} ${b.kind} level ${b.level} at ${b.pos.map((v) => v.toFixed(3)).join(',')}`
      expect(b.pos[0] - half[0], where).toBeGreaterThanOrEqual(inner.minX - 1e-9)
      expect(b.pos[0] + half[0], where).toBeLessThanOrEqual(inner.maxX + 1e-9)
      expect(b.pos[2] - half[2], where).toBeGreaterThanOrEqual(inner.minZ - 1e-9)
      expect(b.pos[2] + half[2], where).toBeLessThanOrEqual(inner.maxZ + 1e-9)
      expect(b.pos[1] - half[1], where).toBeGreaterThanOrEqual(lv.floor - 1e-9)
      expect(b.pos[1] + half[1], where).toBeLessThanOrEqual(lv.ceil + 1e-9)
    }
  })

  it.each(SHELF_IDS)('%s has varied sizes inside the specified ranges', (id) => {
    const { c } = bounds(id)
    const rows = c.instances.filter((b) => b.group === 'row' && b.kind === 'book')
    const hs = rows.map((b) => b.size[1])
    const ts = rows.map((b) => b.size[0])
    expect(Math.min(...hs)).toBeGreaterThanOrEqual(BOOK_HEIGHT_RANGE[0] - 1e-9)
    expect(Math.max(...hs)).toBeLessThanOrEqual(BOOK_HEIGHT_RANGE[1] + 1e-9)
    expect(Math.min(...ts)).toBeGreaterThanOrEqual(BOOK_THICKNESS_RANGE[0] - 1e-9)
    expect(Math.max(...ts)).toBeLessThanOrEqual(BOOK_THICKNESS_RANGE[1] + 1e-9)
    expect(Math.max(...hs) - Math.min(...hs)).toBeGreaterThan(0.08)
    expect(Math.max(...ts) - Math.min(...ts)).toBeGreaterThan(0.025)
    expect(new Set(rows.map((b) => Math.round(b.size[2] * 100))).size).toBeGreaterThan(5)
    for (const s of c.instances.filter((b) => b.kind === 'slipcase')) {
      expect(s.size[1]).toBeGreaterThan(0.18)
      expect(s.size[1]).toBeLessThan(0.2)
      expect(s.size[2]).toBeLessThanOrEqual(SLIPCASE_DEPTH + 1e-9)
    }
    expect(new Set(c.instances.map((b) => b.variant)).size).toBeGreaterThanOrEqual(5)
    for (const b of c.instances) {
      expect(b.variant).toBeGreaterThanOrEqual(0)
      expect(b.variant).toBeLessThan(SPINE_VARIANT_COUNT)
      expect(b.colorIndex).toBeLessThan(b.kind === 'book' ? BOOK_PALETTE.length : TAPE_PALETTE.length)
      expect(b.kind === 'book' ? (SPINE_BOOK_VARIANTS as readonly number[]) : (SPINE_CASE_VARIANTS as readonly number[])).toContain(b.variant)
    }
  })

  it.each(SHELF_IDS)('%s has leaning books (10 to 18 degrees), horizontal stacks and a box of loose tapes', (id) => {
    const { c } = bounds(id)
    const leans = c.instances.filter((b) => b.group === 'lean')
    expect(leans.length).toBeGreaterThanOrEqual(4)
    for (const b of leans) {
      expect(b.tiltDeg).toBeGreaterThanOrEqual(LEAN_ANGLE_RANGE_DEG[0])
      expect(b.tiltDeg).toBeLessThanOrEqual(LEAN_ANGLE_RANGE_DEG[1])
      expect(Math.abs(b.rot[2])).toBeCloseTo((b.tiltDeg * Math.PI) / 180)
    }
    const stacks = c.instances.filter((b) => b.group === 'stack')
    expect(stacks.length).toBeGreaterThanOrEqual(2)
    for (const b of stacks) expect(Math.abs(Math.abs(b.rot[2]) - Math.PI / 2)).toBeLessThan(1e-9)
    expect(c.instances.filter((b) => b.group === 'boxed').length).toBeGreaterThanOrEqual(6)
    expect(c.boxParts.length).toBeGreaterThanOrEqual(5)
    expect(c.boxParts.every((q) => q.mat === 'crate')).toBe(true)
  })

  it.each(SHELF_IDS)('%s has no overlapping books along the shelf (a lean rests against the next book)', (id) => {
    const { g, c } = bounds(id)
    const axis = g.alongX ? 0 : 2
    for (let level = 0; level < SHELF_LEVELS; level++) {
      const spans = c.instances
        .filter((b) => b.level === level)
        .map((b) => ({ group: b.group, lo: b.pos[axis] - orientedHalfExtents(b.size, b.rot)[axis], hi: b.pos[axis] + orientedHalfExtents(b.size, b.rot)[axis] }))
        .sort((a, b) => a.lo - b.lo)
      for (let i = 1; i < spans.length; i++) {
        if (spans[i].group === 'stack' && spans[i - 1].group === 'stack') continue
        // Sorted by the near edge: the previous far edge may only be reached by an earlier, wider item.
        const reach = Math.max(...spans.slice(0, i).filter((s) => !(s.group === 'stack' && spans[i].group === 'stack')).map((s) => s.hi), -Infinity)
        expect(spans[i].lo, `level ${level} item ${i}`).toBeGreaterThanOrEqual(reach - 1e-6)
      }
    }
  })

  it('leaves the layout colliders for the shelves exactly as laid out', () => {
    for (const id of SHELF_IDS) {
      const p = prop(id)
      expect(p.solid).toBe(true)
      expect(COLLIDERS).toContainEqual(p.box)
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

  it('disposes each spine geometry exactly once', () => {
    const spies = spineGeometries.map((g) => vi.spyOn(g, 'dispose'))
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
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

describe('spine geometries', () => {
  it('are unit boxes with 12 triangles whose spine face maps to the variant cell and other faces to the cover cell', () => {
    expect(spineGeometries).toHaveLength(SPINE_VARIANT_COUNT)
    spineGeometries.forEach((g, variant) => {
      expect((g.index ? g.index.count : g.getAttribute('position').count) / 3).toBe(GEOMETRY_TRIANGLES.box)
      const uv = g.getAttribute('uv')
      const spine = spineCellUv(variant)
      const side = spineCellUv(variant < 3 ? SPINE_COVER_CELL : SPINE_CASE_SIDE_CELL)
      for (let i = 0; i < uv.count; i++) {
        const r = Math.floor(i / 4) === 4 ? spine : side
        expect(uv.getX(i)).toBeGreaterThanOrEqual(r.u0 - 1e-9)
        expect(uv.getX(i)).toBeLessThanOrEqual(r.u1 + 1e-9)
        expect(uv.getY(i)).toBeGreaterThanOrEqual(r.v0 - 1e-9)
        expect(uv.getY(i)).toBeLessThanOrEqual(r.v1 + 1e-9)
      }
    })
  })

  it('the six variants use different atlas cells', () => {
    const us = new Set(Array.from({ length: SPINE_VARIANT_COUNT }, (_, v) => spineCellUv(v).u0))
    expect(us.size).toBe(SPINE_VARIANT_COUNT)
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
    // Books fall back to flat instance colours on the white material.
    expect(materials.bookSpine.map).toBeNull()
    expect(getSharedTexture('spineAtlas')).toBeNull()
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
    // The spine atlas multiplies each book's instance colour; the base colour stays white.
    expect(materials.bookSpine.map).toBe(getSharedTexture('spineAtlas'))
    expect(materials.bookSpine.color.getHexString()).toBe('ffffff')
    expect(getSharedTexture('spineAtlas')?.image.width).toBe(512)
    expect(getSharedTexture('spineAtlas')?.image.height).toBe(256)
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

describe('wall, corner and ceiling dressing (task 18.3)', () => {
  afterEach(() => setCanvasFactory(null))

  const sources = import.meta.glob(['./Room.tsx', './Props.tsx', './Stations.tsx', './PartMeshes.tsx', './modelDetail.ts', './sharedResources.ts'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>

  const worldParts = (): Array<{ name: string; parts: Part[] }> => {
    const wanted = ['conduit', 'ventilation', 'cable-loops', 'corner-posts', 'wall-clock', 'desk-lamp', 'desk-lamp-glow']
    return declaredObjects().filter((o) => wanted.includes(o.name))
  }

  const extent = (p: Part) => {
    // Unit planes lie in the XY plane and have no depth.
    const size: Vec3 = p.geo === 'plane' ? [p.scale[0], p.scale[1], 0] : p.scale
    const half = orientedHalfExtents(size, p.rot ?? [0, 0, 0])
    return {
      minX: p.pos[0] - half[0],
      maxX: p.pos[0] + half[0],
      minY: p.pos[1] - half[1],
      maxY: p.pos[1] + half[1],
      minZ: p.pos[2] - half[2],
      maxZ: p.pos[2] + half[2],
    }
  }

  it('filing cabinets have 4 recessed drawers each with a pull, a label slot and a paper label', () => {
    for (const [id, variant] of [['filing-cabinet-a', 0], ['filing-cabinet-b', 1]] as const) {
      const cab = prop(id)
      const parts = filingCabinetParts(cab.box, cab.height, variant)
      expect(parts.filter((p) => p.mat === (variant === 0 ? 'filingDark' : 'filingDarkB'))).toHaveLength(FILING_DRAWERS)
      // Pulls: one round bar per drawer on two posts.
      expect(parts.filter((p) => p.geo === 'cylinderLow' && p.mat === 'metal')).toHaveLength(FILING_DRAWERS)
      expect(parts.filter((p) => p.mat === 'labelSlot')).toHaveLength(FILING_DRAWERS)
      expect(parts.filter((p) => p.mat === 'tapeLabel')).toHaveLength(FILING_DRAWERS)
      // Recessed: the face sits behind the raised frame strips of the same drawer.
      const face = parts.find((p) => p.mat === (variant === 0 ? 'filingDark' : 'filingDarkB'))!
      const strip = parts.find((p) => p.mat === (variant === 0 ? 'filingGrey' : 'filingGreyB') && p.scale[2] === 0.012)!
      expect(strip.pos[2] + strip.scale[2] / 2).toBeGreaterThan(face.pos[2] + face.scale[2] / 2 + 0.005)
      // A top lip that overhangs the body.
      expect(parts.some((p) => p.scale[0] > cab.box.maxX - cab.box.minX && p.pos[1] > cab.height - 0.05)).toBe(true)
      for (const p of parts) expect(extent(p).maxY).toBeLessThanOrEqual(cab.height + 1e-6)
    }
    const a = filingCabinetParts(prop('filing-cabinet-a').box, 1.4, 0)
    const b = filingCabinetParts(prop('filing-cabinet-b').box, 1.4, 1)
    expect(a.length).toBe(b.length)
    expect(a[1].mat).not.toBe(b[1].mat)
  })

  it('the bulletin board has a backing, the cork plane and a four-piece wooden frame, within 0.075 m of the wall', () => {
    const parts = bulletinBoardParts()
    expect(parts.filter((p) => p.mat === 'cork' && p.geo === 'plane')).toHaveLength(1)
    expect(parts.filter((p) => p.mat === 'wood')).toHaveLength(4)
    expect(parts.some((p) => p.mat === 'woodDark')).toBe(true)
    const wallFace = ROOM.bounds.minZ
    for (const p of parts) expect(extent(p).maxZ - wallFace).toBeLessThanOrEqual(0.075 + 1e-6)
  })

  it('has conduit runs, a drop with a junction box and bracket clamps', () => {
    const parts = conduitParts()
    const pipes = parts.filter((p) => p.geo === 'cylinderLow' && p.mat === 'conduit')
    expect(pipes.length).toBeGreaterThanOrEqual(3)
    expect(Math.max(...pipes.map((p) => p.scale[1]))).toBeGreaterThan(7)
    expect(parts.filter((p) => p.geo === 'sphere')).toHaveLength(2)
    expect(parts.some((p) => p.geo === 'box' && p.mat === 'metal' && p.scale[0] >= 0.2)).toBe(true)
    expect(parts.filter((p) => p.geo === 'box' && p.mat === 'metal' && p.scale[0] <= 0.09 && p.scale[1] <= 0.09).length).toBeGreaterThanOrEqual(10)
  })

  it('has a louvred ceiling grille using the grille texture material, and a high wall grille', () => {
    const parts = ventilationParts()
    expect(parts.filter((p) => p.mat === 'grille')).toHaveLength(2)
    expect(parts.filter((p) => p.rot && p.mat === 'metal').length).toBeGreaterThanOrEqual(4)
    expect(parts.some((p) => extent(p).maxY > ROOM.height - 0.01)).toBe(true)
    expect(materials.grille.type).toBe('MeshLambertMaterial')
  })

  it('has hanging cable loops: sagging segments that start and end on the ceiling', () => {
    const parts = cableLoopsParts()
    const segs = parts.filter((p) => p.mat === 'plastic')
    expect(segs.length).toBeGreaterThanOrEqual(24)
    const lowest = Math.min(...segs.map((p) => extent(p).minY))
    expect(lowest).toBeLessThan(ROOM.height - 0.3)
    expect(lowest).toBeGreaterThan(2.2)
    expect(parts.filter((p) => p.mat === 'metal')).toHaveLength(8)
    // Segments are single straight boxes whose length matches the span they cover.
    const loop = cableLoopParts([0, 0], [2, 0], 0.4, 8)
    const total = loop.filter((p) => p.mat === 'plastic').reduce((n, p) => n + p.scale[0], 0)
    expect(total).toBeGreaterThan(2)
    expect(total).toBeLessThan(2.6)
  })

  it('puts a warm emissive lamp on the east end of the reception desk, with a faint additive glow and no light', () => {
    const desk = prop('reception-desk')
    const { x, z, top } = deskLampPosition()
    expect(x).toBeGreaterThan((desk.box.minX + desk.box.maxX) / 2)
    expect(x).toBeLessThan(desk.box.maxX)
    expect(z).toBeGreaterThan(desk.box.minZ)
    expect(z).toBeLessThan(desk.box.maxZ)
    const lamp = deskLampParts()
    expect(lamp.filter((p) => p.mat === 'lampEmissive')).toHaveLength(1)
    expect(lamp.every((p) => extent(p).minY >= top - 1e-6)).toBe(true)
    expect(materials.lampEmissive.type).toBe('MeshBasicMaterial')
    expect(materials.bulb.type).toBe('MeshBasicMaterial')
    const glow = deskLampGlowParts()
    expect(glow.length).toBe(3)
    expect(glow.every((p) => p.geo === 'plane' && p.mat === 'lampHalo')).toBe(true)
    expect(materials.lampHalo.type).toBe('MeshBasicMaterial')
    expect(materials.lampHalo.transparent).toBe(true)
    expect(materials.lampHalo.depthWrite).toBe(false)
    expect(materials.lampHalo.blending).toBe(2) // AdditiveBlending
    expect(materials.lampHalo.opacity).toBeLessThanOrEqual(0.6)
    // The glow stays over the desk top.
    for (const p of glow) {
      const e = extent(p)
      expect(e.minX).toBeGreaterThanOrEqual(desk.box.minX)
      expect(e.maxX).toBeLessThanOrEqual(desk.box.maxX + 0.05)
    }
  })

  it('adds no light: the scene files hold no light declarations and the light count is unchanged', () => {
    const lightRe = /<(ambientLight|pointLight|spotLight|directionalLight|hemisphereLight|rectAreaLight)\b|new (Ambient|Point|Spot|Directional|Hemisphere|RectArea)Light\b/
    for (const [file, src] of Object.entries(sources)) expect(src, file).not.toMatch(lightRe)
    expect(M3_LIGHT_COUNT).toBe(4)
    const lights = (lightingSource.match(/<(ambientLight|pointLight|directionalLight|spotLight|hemisphereLight)\b/g) ?? []).length
    expect(lights).toBe(4)
  })

  it('keeps all new world-space parts inside the room volume (x/z within bounds, y between floor and ceiling 3)', () => {
    const b = ROOM.bounds
    for (const o of worldParts()) {
      expect(o.parts.length, o.name).toBeGreaterThan(0)
      for (const p of o.parts) {
        const e = extent(p)
        const where = `${o.name} ${p.geo}/${p.mat} at ${p.pos.join(',')}`
        expect(e.minX, where).toBeGreaterThanOrEqual(b.minX - 1e-6)
        expect(e.maxX, where).toBeLessThanOrEqual(b.maxX + 1e-6)
        expect(e.minZ, where).toBeGreaterThanOrEqual(b.minZ - 1e-6)
        expect(e.maxZ, where).toBeLessThanOrEqual(b.maxZ + 1e-6)
        expect(e.minY, where).toBeGreaterThanOrEqual(0)
        expect(e.maxY, where).toBeLessThanOrEqual(ROOM.height + 1e-6)
      }
    }
    for (const id of ARCHIVE_BOX_IDS) {
      const p = prop(id)
      for (const q of archiveBoxParts(p.box, p.height)) {
        const e = extent(q)
        expect(e.minX).toBeGreaterThanOrEqual(p.box.minX - 0.03)
        expect(e.maxX).toBeLessThanOrEqual(p.box.maxX + 0.03)
        expect(e.minZ).toBeGreaterThanOrEqual(p.box.minZ - 0.03)
        expect(e.maxZ).toBeLessThanOrEqual(p.box.maxZ + 0.03)
        expect(e.maxY).toBeLessThanOrEqual(p.height + 1e-6)
      }
    }
  })

  it('wall-mounted dressing protrudes at most 0.15 m from the wall it hangs on', () => {
    const r = mainRoomBox()
    const depths = (p: Part) => {
      const e = extent(p)
      return [e.maxZ - r.minZ, e.maxX - r.minX, r.maxZ - e.minZ, r.maxX - e.minX]
    }
    const groups: Array<[string, Part[]]> = [
      ['bulletin-board', bulletinBoardParts()],
      ['conduit', conduitParts()],
      ['wall-clock', wallClockParts()],
      ['corner-posts', cornerPostParts()],
      ['wall-grille', ventilationParts().filter((p) => p.pos[2] > 3)],
    ]
    for (const [name, parts] of groups) {
      expect(parts.length, name).toBeGreaterThan(0)
      for (const p of parts) {
        const d = Math.min(...depths(p))
        expect(d, `${name} ${p.mat} ${p.pos.join(',')}`).toBeGreaterThanOrEqual(0)
        expect(d, `${name} ${p.mat} ${p.pos.join(',')}`).toBeLessThanOrEqual(WALL_PROTRUSION_LIMIT + 1e-6)
      }
    }
  })

  it('keeps door openings, their approach lanes and the island walkway free of new floor-level dressing', () => {
    const island = prop('crt-vhs').box
    const ring = { minX: island.minX - 1.2, maxX: island.maxX + 1.2, minZ: island.minZ - 1.2, maxZ: island.maxZ + 1.2 }
    const lanes = ROOM.doors.map((d) => ({ minX: d.opening.minX - 1.2, maxX: d.opening.maxX, minZ: d.opening.minZ, maxZ: d.opening.maxZ }))
    const overlaps = (e: ReturnType<typeof extent>, a: { minX: number; maxX: number; minZ: number; maxZ: number }) =>
      e.minX < a.maxX && e.maxX > a.minX && e.minZ < a.maxZ && e.maxZ > a.minZ
    for (const o of worldParts()) {
      for (const p of o.parts) {
        const e = extent(p)
        // Head clearance: parts that stay above 2.0 m (cable loops, vents, conduit run) cannot block a walker.
        if (e.minY >= 2.0) continue
        // The desk lamp stands on the desk, which is solid and already outside the walkway.
        if (o.name.startsWith('desk-lamp')) continue
        expect(overlaps(e, ring), `${o.name} ${p.mat} in the island walkway`).toBe(false)
        for (const lane of lanes) expect(overlaps(e, lane), `${o.name} ${p.mat} in a door lane`).toBe(false)
      }
    }
  })

  it('does not overlap the Memory_Shift poster or the layout posters with the filing cabinets or the bulletin board', () => {
    const board = prop('bulletin-board')
    const cabs = [prop('filing-cabinet-a'), prop('filing-cabinet-b')]
    // Shift poster in Props.tsx: x -0.3, width 0.6, y 1.7 +- 0.6 (north wall).
    const shift = { minX: -0.6, maxX: 0, minY: 1.1, maxY: 2.3 }
    const poster = prop('poster-north')
    const posterBox = { minX: poster.box.minX - 0.05, maxX: poster.box.maxX + 0.05 }
    for (const c of [board, ...cabs]) {
      expect(c.box.maxX).toBeLessThanOrEqual(shift.minX)
      expect(c.box.maxX).toBeLessThanOrEqual(posterBox.minX)
    }
    expect(shift.maxX).toBeLessThanOrEqual(posterBox.minX)
  })

  it('wall boxes get metric UVs and are disposed once, twice-safe', () => {
    const wall = ROOM.walls[0]
    const g = wallGeometry(wall, ROOM.height)
    expect(wallGeometry(wall, ROOM.height)).toBe(g)
    const uv = g.getAttribute('uv')
    // Face +z (vertices 16..19): u spans the wall length / 2.5 m, v spans the wall height / 3 m = 1.
    const us = [16, 17, 18, 19].map((i) => uv.getX(i))
    const vs = [16, 17, 18, 19].map((i) => uv.getY(i))
    expect(Math.max(...us) - Math.min(...us)).toBeCloseTo((wall.maxX - wall.minX) / 2.5)
    expect(Math.max(...vs) - Math.min(...vs)).toBeCloseTo(ROOM.height / 3)
    expect(Math.min(...vs)).toBeCloseTo(0)
    const spy = vi.spyOn(g, 'dispose')
    disposeSharedResources()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(() => disposeSharedResources()).not.toThrow()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(wallGeometry(wall, ROOM.height)).not.toBe(g)
  })

  it('binds the new textures: wall (near-white multiplier), woven rug, cork board and lamp halo; each disposed once', () => {
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    for (const id of ['wallPanel', 'rugWoven', 'corkBoard', 'lampGlow'] as const) expect(getSharedTexture(id)).not.toBeNull()
    expect(materials.wall.map).toBe(getSharedTexture('wallPanel'))
    expect(materials.wall.map?.wrapS).toBe(1000) // RepeatWrapping
    expect(materials.wall.color.getHexString()).toBe(BASE_WALL_COLOR.slice(1))
    expect(materials.rugWoven.map).toBe(getSharedTexture('rugWoven'))
    expect(materials.rug.map).toBeNull()
    expect(materials.cork.map).toBe(getSharedTexture('corkBoard'))
    expect(materials.lampHalo.map).toBe(getSharedTexture('lampGlow'))
    const spies = (['wallPanel', 'rugWoven', 'corkBoard', 'lampGlow'] as const).map((id) => vi.spyOn(getSharedTexture(id)!, 'dispose'))
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(() => disposeSharedResources()).not.toThrow()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(materials.wall.map).toBeNull()
  })

  it('reports the 18.3 budget numbers', () => {
    const report = sceneDetailReport()
    console.info(
      `[18.3] computed triangles: ${report.totalTriangles} (detail ${report.detailTriangles} + base ${report.baseTriangles}), ` +
        `draw-call estimate: ${report.totalDrawCalls}, textures ${report.textureCount}, texture memory estimate ${(report.textureMemoryBytes / 1048576).toFixed(2)} MB, ` +
        `lights ${M3_LIGHT_COUNT} (computed, not runtime-measured)`,
    )
    expect(report.totalTriangles).toBeLessThan(SCENE_TRIANGLE_BUDGET)
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(TEXTURE_MEMORY_BUDGET_BYTES)
    expect(report.textureCount).toBe(18)
    for (const name of ['conduit', 'ventilation', 'cable-loops', 'corner-posts', 'wall-clock', 'desk-lamp', 'desk-lamp-glow']) {
      expect(report.objects.map((o) => o.name)).toContain(name)
    }
  })
})
