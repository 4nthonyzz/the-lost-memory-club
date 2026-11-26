import { afterEach, describe, expect, it, vi } from 'vitest'
import { Box3, Euler, Matrix3, Matrix4, Mesh, Object3D, Vector3 } from 'three'
import { OBB } from 'three/examples/jsm/math/OBB.js'
import { COLLIDERS, INTERACTABLE_DEFS, MANUAL_PLACEMENT, ROOM, STATION_DEFS } from '../layout/roomLayout'
import { crtScreenPlacement } from './Effects'
import { ARCADE_LIGHT_DISTANCE, ARCADE_LIGHT_POSITION, CRT_LIGHT_POSITION, M3_LIGHT_COUNT, WEST_LIGHT_POSITION } from './Lighting'
import {
  ARCHIVE_BOX_IDS,
  FILING_DRAWERS,
  WALL_PROTRUSION_LIMIT,
  archiveBoxParts,
  cableLoopParts,
  cableLoopsParts,
  conduitParts,
  cornerPostParts,
  CEILING_BLOOM_DROP,
  DESK_LAMPS,
  FIXTURE_LENGTH,
  LAMP_CONE_TOP_Y,
  LAMP_SHADE_OPENING,
  LAMP_POOL_LIFT,
  LAMP_POOL_RADIUS_WANTED,
  ceilingFixtureParts,
  deskLampParts,
  fixtureCentres,
  lampPoolPlacement,
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
  ARCADE_CABINET_GAMES,
  ARCADE_CABINET_IDS,
  ARCADE_CABINET_STYLES,
  arcadeCabinetParts,
  arcadeFloorParts,
  arcadeSignBodyParts,
  arcadeSignLetterParts,
  arcadeSignParts,
  armchairParts,
  crtStackParts,
  couchParts,
  COUCH_SEAT_TOP,
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
  doorDetailParts,
  posterParts,
  clampLeanHeight,
  leanFootprint,
  orientedHalfExtents,
  sceneDetailReport,
  shelfContents,
  shelfFrameParts,
  shelfGeometry,
  shelfInnerBounds,
  instanceColour,
  MANUAL_SIZE,
  MANUAL_BOOKS,
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
  MANUAL_COVER_COLOURS,
  VCR_CHASSIS_COLOR,
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
import { ARCADE_SCREEN_BASE_COLORS, BASE_CRT_SCREEN_COLOR, BASE_WALL_COLOR, CRT_CASING_COLORS } from './memoryShift'
import { MUG_COFFEE_H, MUG_RIM_H, MUG_STAIN_H, NOTE_DX, NOTE_DZ, cablePathParts, consoleCableParts, deskParts, partGroupKey } from './modelDetail'
import { textureMemoryBytes } from './proceduralTextures'
import { WOOD_METRES_PER_REPEAT, fabricBoxCount, metricBoxGeometry, woodBoxCount, woodBoxGeometry } from './sharedResources'
import { FABRIC_METRES_PER_REPEAT, CABINET_DETAIL_REGIONS, BOX_FACE_FRONT, MANUAL_STRIP_KEYS, detailUvRect } from './proceduralTextures'
import { atlasBoxCount, atlasBoxGeometry, manualGeometries } from './sharedResources'
import { COUCH_FABRIC_COLORS } from './memoryShift'

/** Task 26.1: the mug coffee disc and the desk stain disc, 32 triangles each (8-sided low cylinders). */
const TASK_26_1_TRIANGLES = 64

/** Task 27.1: the three cream manual band boxes (12 triangles each) are replaced by a printed band in the texture: -36 triangles. */
const TASK_27_1_TRIANGLES = -36
/** Task 28.2: the thicker manuals (0.085 m instead of 0.06 m) displace three more ordinary books on shelf-b (12 triangles each); the manuals themselves stay one box each. */
const TASK_28_2_TRIANGLES = -36
/**
 * Task 30.1: round lamp glow and cones. Cones 24 -> 48 triangles each (+48), pools 2 -> 24 (+44), table inner glow 2 -> 24 (+22), banker halo 2 -> 24 (+22),
 * table halo dropped (-2), both bulbs sphere 80 -> low cylinder 32 (-96). Total +38 (19,116 -> 19,154).
 */
const TASK_30_1_TRIANGLES = 38

/**
 * Task 33.1: record player and triangle reclaim. The turntable console costs 526 triangles (19,154 + 526 = 19,680); culling the unseen -Y face of
 * 34 floor-flush boxes of the existing models saves 68 (19,612); simplifying the hidden console cables saves 15 segments x 32 = 480 (19,132).
 * Net -22 (19,154 -> 19,132).
 */
const TASK_33_1_TURNTABLE = 526
const TASK_33_1_CULLED_EXISTING = -68
const TASK_33_1_CABLES = -480
const TASK_33_1_TRIANGLES = TASK_33_1_TURNTABLE + TASK_33_1_CULLED_EXISTING + TASK_33_1_CABLES

/**
 * Task 34.1: the Hi-Fi listening table (638 triangles: the unchanged 478-triangle turntable assembly and walnut table, the record crate 48, four LP sleeves 48,
 * the NOW PLAYING jacket stand 36, the LED bar 12 and the glow disc 24, minus 8 for the table's own wall-flush back faces) replaces the 526-triangle 33.1
 * console: +112. Wall-flush faces of the existing models are culled (24 faces, -48): 8 corner-post faces (-16), 2 faces on each of the 3 bookcases (-12),
 * 1 on each of the 2 filing cabinets (-4), 1 on the conduit junction box (-2), 1 on the south wall grille frame (-2) and 6 on the door-detail plates (-12).
 * Net +64 (19,132 -> 19,196).
 */
const TASK_34_1_TABLE = 638
const TASK_34_1_RECLAIMED = -48
const TASK_34_1_TRIANGLES = TASK_34_1_TABLE - TASK_33_1_TURNTABLE + TASK_34_1_RECLAIMED
/**
 * Task 35.1: the two-tier console (1,250 triangles) replaces the 638-triangle Hi-Fi table (+612) and the floor loudspeaker adds 180 (the 4 kicked back faces of the old table
 * and the new posts and slab balance out). Net +792 (19,196 -> 19,988). The raised caps are the Requirement 14 limit (20,000 triangles) and a draw-call estimate under 425.
 */
const TASK_35_1_CONSOLE = 1250
const TASK_35_1_SPEAKER = 180
const TASK_35_1_TRIANGLES = TASK_35_1_CONSOLE - TASK_34_1_TABLE + TASK_35_1_SPEAKER
/** Current-state caps (task 35.1): scene triangles and the draw-call estimate limit (exclusive). */
const TRIANGLE_CAP = 20000
const DRAW_CALL_CAP = 425
/** Task 27.1: cabinetAndManualDetail, 256 x 128 mipmapped (estimate 174,326 bytes), added on top of the older memory caps below. */
const TASK_27_1_TEXTURE_BYTES = Math.round(256 * 128 * 4 * 1.33)

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
    expect(report.totalDrawCalls).toBeLessThan(DRAW_CALL_CAP)
  })

  it('texture memory estimate is within 8 MB and matches the specs', () => {
    expect(report.textureCount).toBe(TEXTURE_IDS.length)
    expect(report.textureMemoryBytes).toBe(totalTextureMemoryBytes())
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(TEXTURE_MEMORY_BUDGET_BYTES)
  })

  it('puts the crt-light above and in front of the island console', () => {
    const vhs = STATION_DEFS.find((s) => s.id === 'vhs')!
    expect([...CRT_LIGHT_POSITION]).toEqual([vhs.anchor.x, 1.6, vhs.anchor.z + 0.9])
    expect([...CRT_LIGHT_POSITION]).toEqual([0, 1.6, -0.6])
    expect(lightingSource).toContain('name="crt-light"')
  })

  it('puts the warm west light within range of the west shelf fronts', () => {
    expect([...WEST_LIGHT_POSITION]).toEqual([-2.6, 2.3, 0.2])
    expect(lightingSource).toContain('#ffb766')
    const dist = /name="west-light"[^>]*distance=\{([\d.]+)\}/.exec(lightingSource)!
    const range = Number(dist[1])
    for (const id of ['shelf-a', 'shelf-b']) {
      const b = prop(id).box
      for (const z of [b.minZ, b.maxZ]) for (const y of [0.2, 1.1, 2.2]) {
        const d = Math.hypot(b.maxX - WEST_LIGHT_POSITION[0], y - WEST_LIGHT_POSITION[1], z - WEST_LIGHT_POSITION[2])
        expect(d, id).toBeLessThan(range)
      }
    }
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
    expect(STATION_DEFS.find((s) => s.id === 'vhs')).toMatchObject({ anchor: { x: (crt.box.minX + crt.box.maxX) / 2, z: crt.box.maxZ }, collider: crt.box, facing: '+z' })
    // The three arcade cabinets face west: each anchor is centred on its west face (minX).
    const arcadeDefs = STATION_DEFS.filter((s) => s.id === 'arcade')
    expect(arcadeDefs).toHaveLength(3)
    ARCADE_CABINET_IDS.forEach((id, i) => {
      const cab = prop(id)
      expect(arcadeDefs[i]).toMatchObject({
        anchor: { x: cab.box.minX, z: (cab.box.minZ + cab.box.maxZ) / 2 },
        collider: cab.box,
        facing: '-x',
        arcadeGame: ARCADE_CABINET_GAMES[id],
      })
      expect(cab.facing).toBe('-x')
    })
  })

  it('the CRT screen part matches the placement Effects.tsx uses, derived from the island console', () => {
    const crt = prop('crt-vhs')
    const rect = crtScreenRect(crt.box, crt.height)
    // The television is 0.9 m wide, is centred on the console, 5 cm behind its front face, on top (0.7 m).
    const crtH = crt.height - CONSOLE_TOP
    expect(rect.position[0]).toBeCloseTo((crt.box.minX + crt.box.maxX) / 2 - 0.05)
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
    expect(monitor.filter((p) => p.mat === 'smpteScreen')).toHaveLength(1)
    expect(monitor.some((p) => p.mat === 'crtScreen' || p.mat === 'screenOff')).toBe(false)
    // Only the television carries the shared crtScreen plane.
    const all = [...mediaConsoleParts(crt.box), ...vcrDeckParts(crt.box), ...consoleTapeParts(crt.box), ...monitor]
    expect(all.some((p) => p.mat === 'crtScreen')).toBe(false)
    expect(consoleTapeParts(crt.box).filter((p) => p.mat === 'tapeBlack').length).toBeGreaterThanOrEqual(4)
    // The console top is at 0.7 m; the VCR stands on the lower shelf below it.
    const top = mediaConsoleParts(crt.box).find((p) => p.pos[1] > 0.65 && p.scale[0] > 1.8)!
    expect(top.pos[1] + top.scale[1] / 2).toBeCloseTo(CONSOLE_TOP)
    const vcr = vcrDeckParts(crt.box).find((p) => p.mat === 'vcrDeck')!
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
  it('each arcade cabinet has exactly one screen plane and one marquee, in its own game materials', () => {
    const screens = new Set<string>()
    const marquees = new Set<string>()
    const moldings = new Set<string>()
    for (const id of ARCADE_CABINET_IDS) {
      const a = prop(id)
      const style = ARCADE_CABINET_STYLES[ARCADE_CABINET_GAMES[id]]
      const parts = arcadeCabinetParts(facingFrame(a.box, a.facing).local, a.height, ARCADE_CABINET_GAMES[id])
      expect(parts.filter((p) => p.mat === style.screen && p.geo === 'plane')).toHaveLength(1)
      expect(parts.filter((p) => p.mat === style.marquee && p.geo === 'plane')).toHaveLength(1)
      // The old single-cabinet and powered-down materials are gone from the scene.
      expect(parts.some((p) => ['arcadeScreen', 'marquee', 'outOfOrderScreen', 'marqueeOff', 'screenOff'].includes(p.mat))).toBe(false)
      screens.add(style.screen)
      marquees.add(style.marquee)
      moldings.add(style.molding)
      for (const key of [style.screen, style.marquee, style.molding]) expect(materials[key].type).toBe('MeshBasicMaterial')
    }
    expect(screens.size).toBe(3)
    expect(marquees.size).toBe(3)
    expect(moldings.size).toBe(3)
    // Flat colours of the three schemes differ (phosphor green, violet, amber).
    const hex = (k: 'arcadeScreenSnake' | 'arcadeScreenMaze' | 'arcadeScreenFrequency') => materials[k].color.getHexString()
    expect(new Set([hex('arcadeScreenSnake'), hex('arcadeScreenMaze'), hex('arcadeScreenFrequency')]).size).toBe(3)
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
    for (const n of [...ARCADE_CABINET_IDS, 'crt-stack', 'arcade-sign', 'arcade-floor']) expect(names).toContain(n)
    expect(names).not.toContain('arcade-companion')
    expect(names).not.toContain('arcade-cabinet')
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
    const a = prop('arcade-maze')
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

  it.each(ARCADE_CABINET_IDS)('%s has dual ball-top joysticks, six concave buttons, two coin slots and T-molding', (id) => {
    const a = prop(id)
    const game = ARCADE_CABINET_GAMES[id]
    const style = ARCADE_CABINET_STYLES[game]
    const parts = arcadeCabinetParts(a.box, a.height, game)
    // Six distinct coloured caps, each sunk into a wider dark inset ring.
    const buttons = parts.filter((p) => /^btn/.test(p.mat) && p.geo === 'cylinder')
    expect(buttons).toHaveLength(6)
    expect(new Set(buttons.map((p) => p.mat)).size).toBe(6)
    const rings = parts.filter((p) => p.mat === 'bezel' && p.geo === 'cylinderLow' && p.scale[0] === 0.08)
    expect(rings).toHaveLength(6)
    for (const b of buttons) expect(rings.some((r) => r.pos[0] === b.pos[0] && r.pos[1] < b.pos[1])).toBe(true)
    // Two joysticks: a ball top (sphere) on a thin shaft (cylinder) on a base plate, one per player.
    const balls = parts.filter((p) => p.geo === 'sphere')
    expect(balls).toHaveLength(2)
    expect(new Set(balls.map((p) => p.mat)).size).toBe(2)
    expect(parts.filter((p) => p.geo === 'cylinderLow' && p.mat === 'metal' && p.scale[1] === 0.12)).toHaveLength(2)
    expect(parts.filter((p) => p.geo === 'cylinderLow' && p.mat === 'metal' && p.scale[1] === 0.012)).toHaveLength(2)
    // Two glowing coin slots, each with a lit '25c' label bar.
    expect(parts.filter((p) => p.mat === 'coinGlow')).toHaveLength(4)
    // Five T-molding strips per side in the game's colour, plus the tilted bezel assembly and a grille bar.
    expect(parts.filter((p) => p.mat === style.molding)).toHaveLength(10)
    expect(parts.filter((p) => p.mat === 'grille')).toHaveLength(3)
    expect(parts.filter((p) => p.mat === 'deckPlate')).toHaveLength(1)
    expect(parts.filter((p) => p.mat === style.marquee)).toHaveLength(1)
  })

  it('the three cabinets use three distinct T-molding accents: green, crimson and amber', () => {
    const g = materials.moldingSnake.color.getHexString()
    const c = materials.moldingMaze.color.getHexString()
    const a = materials.moldingFrequency.color.getHexString()
    expect(new Set([g, c, a]).size).toBe(3)
    expect(parseInt(g.slice(2, 4), 16)).toBeGreaterThan(parseInt(g.slice(0, 2), 16))
    expect(parseInt(c.slice(0, 2), 16)).toBeGreaterThan(parseInt(c.slice(2, 4), 16) * 3)
    expect(parseInt(a.slice(0, 2), 16)).toBeGreaterThan(200)
  })

  it('the arcade light sits in front of the cabinets and lights all three anchors evenly (range, ratio <= 1.5)', () => {
    expect(lightingSource).toContain('name="arcade-light"')
    const dists = STATION_DEFS.filter((s) => s.id === 'arcade').map((s) =>
      // Distance to the middle of each cabinet front (screen height 1.3 m).
      Math.hypot(s.anchor.x - ARCADE_LIGHT_POSITION[0], 1.3 - ARCADE_LIGHT_POSITION[1], s.anchor.z - ARCADE_LIGHT_POSITION[2]),
    )
    expect(dists).toHaveLength(3)
    // The farthest front corner (floor level, outer edge of the outer cabinets) must still be inside the light range.
    for (const id of ARCADE_CABINET_IDS) {
      const b = prop(id).box
      for (const z of [b.minZ, b.maxZ]) for (const y of [0, 1.8]) {
        expect(Math.hypot(b.minX - ARCADE_LIGHT_POSITION[0], y - ARCADE_LIGHT_POSITION[1], z - ARCADE_LIGHT_POSITION[2])).toBeLessThan(ARCADE_LIGHT_DISTANCE)
      }
    }
    expect(Math.max(...dists) / Math.min(...dists)).toBeLessThanOrEqual(1.5)
    expect(lightingSource).toContain('distance={ARCADE_LIGHT_DISTANCE}')
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
    check(crtTelevisionParts(crt.box, crt.height), crt.box)
    check(vcrDeckParts(crt.box), crt.box)
    // Arcade parts are built in the local frame (front toward +Z), then rotated by the group.
    for (const id of ARCADE_CABINET_IDS) {
      const arcade = prop(id)
      const arcadeLocal = facingFrame(arcade.box, arcade.facing).local
      check(arcadeCabinetParts(arcadeLocal, arcade.height, ARCADE_CABINET_GAMES[id]), arcadeLocal)
    }
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
      // Task 28.2: the manuals are the only items that protrude, up to their spine face at x -4.555 (0.06 m past the interior front).
      expect(b.pos[0] + half[0], where).toBeLessThanOrEqual((b.group === 'manual' ? -4.555 : inner.maxX) + 1e-9)
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
    expect(c.boxParts.every((q) => q.mat === 'crateWood')).toBe(true)
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

describe('arcade manuals on the west bookcase (task 23.2)', () => {
  const p = prop(MANUAL_PLACEMENT.shelfId)
  const c = shelfContents(p.id, p.box, p.height)
  const inner = shelfInnerBounds(p.box, p.height)
  const manuals = c.instances.filter((b) => b.group === 'manual')
  const ext = (b: (typeof manuals)[number]) => {
    const h = orientedHalfExtents(b.size, b.rot)
    return { minX: b.pos[0] - h[0], maxX: b.pos[0] + h[0], minY: b.pos[1] - h[1], maxY: b.pos[1] + h[1], minZ: b.pos[2] - h[2], maxZ: b.pos[2] + h[2] }
  }

  it('has three distinct manuals with the emerald, crimson and amber covers on the eye-level shelf', () => {
    expect(MANUAL_PLACEMENT.shelfId).toBe('shelf-b')
    expect(manuals.map((b) => b.manualId)).toEqual(['manual-snake', 'manual-maze', 'manual-frequency'])
    // Task 28.2: the cloth colours are painted into the texture, so the instance colour is white (see the 28.2 block below).
    expect(manuals.map((b) => instanceColour(b))).toEqual(['#ffffff', '#ffffff', '#ffffff'])
    const lv = inner.levels[MANUAL_PLACEMENT.level]
    expect(lv.floor).toBeGreaterThanOrEqual(1.1)
    expect(lv.floor).toBeLessThanOrEqual(1.4)
    for (const b of manuals) {
      const e = ext(b)
      // Thick collector hardcover (task 28.2), standing on the board, under the next board.
      expect(b.size[0]).toBe(MANUAL_SIZE[0])
      expect(b.size[1]).toBeGreaterThanOrEqual(BOOK_HEIGHT_RANGE[1])
      expect(e.minY).toBeCloseTo(lv.floor, 9)
      expect(e.maxY).toBeLessThanOrEqual(lv.ceil - 0.003 + 1e-9)
      // Spine faces +x and protrudes past the bookcase front (task 28.2); the back stays inside the bookcase.
      expect(e.maxX).toBeCloseTo(-4.555, 9)
      expect(e.minX).toBeGreaterThanOrEqual(inner.minX - 1e-9)
      expect(e.minZ).toBeGreaterThanOrEqual(inner.minZ - 1e-9)
      expect(e.maxZ).toBeLessThanOrEqual(inner.maxZ + 1e-9)
      // The anchor is 0.035 m in front of the spine, centred on the book.
      const def = INTERACTABLE_DEFS.find((d) => d.id === b.manualId)!
      expect(def.anchor.x).toBe(-4.52)
      expect(def.anchor.z).toBeCloseTo(b.pos[2], 9)
    }
  })

  it('does not overlap any neighbour on its level (the printed label band replaced the cream band parts in task 27.1)', () => {
    for (const m of manuals) {
      const a = ext(m)
      for (const b of c.instances.filter((q) => q !== m && q.level === m.level)) {
        const e = ext(b)
        expect(a.maxZ <= e.minZ + 1e-9 || a.minZ >= e.maxZ - 1e-9, `${m.manualId} vs ${b.group} at z ${b.pos[2].toFixed(3)}`).toBe(true)
      }
    }
    // Only the manual bookcase gets manuals.
    for (const id of SHELF_IDS.filter((s) => s !== MANUAL_PLACEMENT.shelfId)) {
      const q = prop(id)
      const other = shelfContents(id, q.box, q.height)
      expect(other.instances.some((b) => b.group === 'manual')).toBe(false)
    }
    // No separate band parts any more: the shelf frame and boxes contain no cream material.
    expect(shelfFrameParts(p.box, p.height).concat(c.boxParts).some((q) => (q.mat as string) === 'manualBand')).toBe(false)
  })

  it('keeps the budgets: triangles < 20,000 with a Task 23 delta <= +120, 4 lights, texture memory <= 8 MB', () => {
    const report = sceneDetailReport()
    const TASK_23_BASELINE = 19172 // before task 23.1
    const AFTER_23_1 = 19054
    expect(report.totalTriangles).toBeLessThan(SCENE_TRIANGLE_BUDGET)
    expect(report.totalTriangles - TASK_23_BASELINE).toBeLessThanOrEqual(120 + TASK_35_1_TRIANGLES)
    expect(report.totalTriangles - AFTER_23_1).toBeLessThanOrEqual(120 + TASK_26_1_TRIANGLES + TASK_35_1_TRIANGLES) // 26.1 adds the mug coffee disc and the stain disc
    expect(M3_LIGHT_COUNT).toBe(4)
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(8 * 1048576)
    console.info(`[23.2] triangles ${report.totalTriangles} (delta from 23.1 ${report.totalTriangles - AFTER_23_1}), texture memory ${(report.textureMemoryBytes / 1048576).toFixed(3)} MiB`)
  })

  it('keeps the Task 24 budgets after 24.2: triangles < 20,000 and delta <= +100 from 19,042, 4 lights, texture memory <= 8 MB', () => {
    const report = sceneDetailReport()
    const TASK_24_BASELINE = 19042 // before task 24.1
    expect(report.totalTriangles).toBeLessThan(SCENE_TRIANGLE_BUDGET)
    expect(report.totalTriangles - TASK_24_BASELINE).toBeLessThanOrEqual(100 + TASK_26_1_TRIANGLES + TASK_35_1_TRIANGLES)
    expect(M3_LIGHT_COUNT).toBe(4)
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(8 * 1048576)
    // Nine of the ten interactables add no geometry (the notes reuse existing parts); the tenth is the 33.1 record player.
    expect(INTERACTABLE_DEFS).toHaveLength(10) // 25.2 adds the Club Archive Notice, 33.1 the record player
    console.info(`[24.2] triangles ${report.totalTriangles} (delta from 19042 ${report.totalTriangles - TASK_24_BASELINE}), texture memory ${(report.textureMemoryBytes / 1048576).toFixed(3)} MiB`)
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
    // Screens and marquees keep their flat game colours.
    for (const key of ['arcadeScreenSnake', 'arcadeScreenMaze', 'arcadeScreenFrequency', 'marqueeSnake', 'marqueeMaze', 'marqueeFrequency'] as const) {
      expect(materials[key].map).toBeNull()
    }
    expect(materials.arcadeScreenSnake.color.getHexString()).toBe(ARCADE_SCREEN_BASE_COLORS.snake.slice(1))
    expect(materials.arcadeScreenMaze.color.getHexString()).toBe(ARCADE_SCREEN_BASE_COLORS.maze.slice(1))
    expect(materials.arcadeScreenFrequency.color.getHexString()).toBe(ARCADE_SCREEN_BASE_COLORS.frequency.slice(1))
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
    // Each cabinet screen is one shared material; memoryShift only tints its colour (white while textured).
    expect(materials.arcadeScreenSnake.map).toBe(getSharedTexture('attractSnake'))
    expect(materials.arcadeScreenSnake.color.getHexString()).toBe('ffffff')
    expect(getSharedTexture('attractSnake')?.magFilter).toBe(1003) // NearestFilter
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
    expect(materials.arcadeScreenSnake.map).toBeNull()
    // The flat game colour comes back when the texture goes away.
    expect(materials.arcadeScreenSnake.color.getHexString()).toBe(ARCADE_SCREEN_BASE_COLORS.snake.slice(1))
    expect(() => disposeSharedResources()).not.toThrow()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
  })

  it('rebuilds fresh textures after a dispose so a remount works', () => {
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    const before = getSharedTexture('marqueeSnake')
    disposeSharedResources()
    ensureSharedTextures()
    const after = getSharedTexture('marqueeSnake')
    expect(after).not.toBeNull()
    expect(after).not.toBe(before)
    expect(materials.marqueeSnake.map).toBe(after)
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
  it('arcade cabinet has a stepped side wing, a tilted screen hood, glowing coin slots and grilles', () => {
    const a = prop('arcade-snake')
    const parts = arcadeCabinetParts(facingFrame(a.box, a.facing).local, a.height, 'snake')
    expect(parts.filter((p) => p.mat === 'coinGlow')).toHaveLength(4)
    expect(parts.filter((p) => p.mat === 'grille').length).toBeGreaterThanOrEqual(2)
    expect(parts.filter((p) => p.mat === 'deckPlate')).toHaveLength(1)
    // Four wing boxes per side (one lower, three upper steps) that get shorter toward the back.
    const wings = parts.filter((p) => p.mat === 'cabinet' && p.geo === 'box' && Math.abs(p.scale[0] - 0.03) < 1e-9 && p.pos[0] > 0.5)
    expect(wings).toHaveLength(4)
    const depths = wings.slice(1).map((p) => p.scale[2])
    expect([...depths].sort((x, y) => y - x)).toEqual(depths)
    expect(new Set(depths).size).toBe(3)
    // Recessed, tilted bezel: the screen plane leans back and is surrounded by four bezel strips; a visor and two
    // cheeks (cabinet boxes) stand in front of it.
    const screen = parts.find((p) => p.mat === 'arcadeScreenSnake')!
    expect(screen.rot![0]).toBeLessThan(0)
    const hood = parts.filter((p) => p.mat === 'cabinet' && p.geo === 'box' && p.pos[2] > screen.pos[2] && p.pos[1] > 1.2 && p.pos[1] < 1.7 && p.rot && p.scale[1] <= 0.5)
    expect(hood.length).toBeGreaterThanOrEqual(3)
    expect(parts.filter((p) => p.mat === 'bezel' && p.geo === 'box' && p.rot && p.rot[0] === screen.rot![0])).toHaveLength(4)
  })

  it('desk has a mug, a notepad and three loose tapes; chairs have rolled arms and a pillow', () => {
    const d = prop('reception-desk')
    const desk = declaredObjects().find((o) => o.name === 'desk')!.parts
    expect(desk.filter((p) => p.mat === 'mug').length).toBeGreaterThanOrEqual(2)
    expect(desk.filter((p) => p.mat === 'paper')).toHaveLength(1)
    expect(desk.filter((p) => p.mat === 'tapeBlack').length).toBeGreaterThanOrEqual(3)
    expect(d.height).toBe(1)
    expect(armchairParts(prop('abandoned-chair').box).filter((p) => p.geo === 'cylinderLow' && p.mat === 'armchairBody').length).toBeGreaterThanOrEqual(3)
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
    expect(parts.filter((p) => p.mat === 'crateWood').length).toBeGreaterThanOrEqual(4)
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
    const wanted = ['conduit', 'ventilation', 'cable-loops', 'corner-posts', 'wall-clock', 'desk-lamp-left', 'desk-lamp-right']
    return declaredObjects().filter((o) => wanted.includes(o.name))
  }

  const extent = (p: Part) => {
    // Unit planes lie in the XY plane and have no depth.
    const size: Vec3 = p.geo === 'plane' || p.geo === 'disc' ? [p.scale[0], p.scale[1], 0] : p.scale
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
      expect(parts.filter((p) => p.mat === 'filingCard')).toHaveLength(FILING_DRAWERS)
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

  describe('desk lamps (task 23.1)', () => {
    const desk = prop('reception-desk')
    const top = desk.height
    const lampParts = (id: string, on: boolean) => {
      const def = DESK_LAMPS.find((l) => l.id === id)!
      return deskLampParts(prop(id).box, def.kind, on, top)
    }
    const body = (parts: Part[]) => parts.filter((p) => p.lampRole !== 'sprite' && p.lampRole !== 'pool' && p.lampRole !== 'cone')
    const overlaps = (a: ReturnType<typeof extent>, b: ReturnType<typeof extent>) =>
      a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY && a.minZ < b.maxZ && a.maxZ > b.minZ

    it('has a green banker lamp on the left and a cream table lamp on the right, with distinct shade materials', () => {
      expect(DESK_LAMPS.map((l) => l.id)).toEqual(['desk-lamp-left', 'desk-lamp-right'])
      const left = lampParts('desk-lamp-left', true)
      const right = lampParts('desk-lamp-right', true)
      expect(left.some((p) => p.mat === 'lampGreenShadeOn')).toBe(true)
      expect(right.some((p) => p.mat === 'lampCreamShadeOn' && p.geo === 'cone')).toBe(true)
      expect(left.some((p) => p.mat === 'lampCreamShadeOn' || p.mat === 'lampCreamShade')).toBe(false)
      expect(right.some((p) => p.mat === 'lampGreenShadeOn' || p.mat === 'lampGreenShade')).toBe(false)
      expect(materials.lampGreenShade.color.getHexString()).not.toBe(materials.lampCreamShade.color.getHexString())
      expect(prop('desk-lamp-left').box.maxX).toBeLessThan(prop('desk-lamp-right').box.minX)
      for (const parts of [left, right]) {
        // 30.1: the table lamp has no halo sprite (its cone, pool, inner glow and emissive shade carry the look).
        for (const role of ['bulb', 'inner', 'pool', 'cone'] as const) expect(parts.filter((p) => p.lampRole === role), role).toHaveLength(1)
        expect(parts.filter((p) => p.lampRole === 'sprite')).toHaveLength(parts === left ? 1 : 0)
        expect(parts.some((p) => p.mat === 'brass')).toBe(true)
      }
    })

    it('on uses the lit materials and off the unlit ones, without mutating shared materials', () => {
      for (const id of DESK_LAMPS.map((l) => l.id)) {
        const on = lampParts(id, true)
        const off = lampParts(id, false)
        const mat = (parts: Part[], role: string) => parts.find((p) => p.lampRole === role)!.mat
        expect([mat(on, 'bulb'), mat(on, 'inner')]).toEqual(['bulb', 'lampInnerOn'])
        if (id === 'desk-lamp-left') expect(mat(on, 'sprite')).toBe('lampHalo')
        expect([mat(on, 'pool'), mat(on, 'cone')]).toEqual(id === 'desk-lamp-left' ? ['lampPoolBanker', 'lampConeBanker'] : ['lampPool', 'lampConeTable'])
        expect([mat(off, 'bulb'), mat(off, 'inner'), mat(off, 'pool'), mat(off, 'cone')]).toEqual(['lampBulbOff', 'lampInnerOff', 'lampGlowOff', 'lampGlowOff'])
        if (id === 'desk-lamp-left') expect(mat(off, 'sprite')).toBe('lampGlowOff')
        // Same geometry and placement in both states: only the materials differ.
        expect(off.map((p) => [p.geo, p.pos, p.scale])).toEqual(on.map((p) => [p.geo, p.pos, p.scale]))
      }
      expect(materials.bulb.type).toBe('MeshBasicMaterial')
      expect(materials.lampInnerOn.type).toBe('MeshBasicMaterial')
      expect(materials.lampBulbOff.type).toBe('MeshLambertMaterial')
      expect(materials.lampInnerOff.type).toBe('MeshLambertMaterial')
      expect(materials.lampGlowOff.visible).toBe(false)
      // Lit sprite and pool are additive, transparent and do not write depth.
      for (const m of [materials.lampHalo, materials.lampPool, materials.lampPoolBanker, materials.lampConeBanker, materials.lampConeTable]) {
        expect(m.type).toBe('MeshBasicMaterial')
        expect(m.transparent).toBe(true)
        expect(m.depthWrite).toBe(false)
        expect(m.blending).toBe(2) // AdditiveBlending
      }
      expect(materials.lampPool.opacity).toBeCloseTo(0.42, 5) // raised from 0.32 in 25.1
      // A lamp's state is independent: left on / right off gives different material sets for the two lamps.
      expect(lampParts('desk-lamp-left', true).find((p) => p.lampRole === 'pool')!.mat).not.toBe(
        lampParts('desk-lamp-right', false).find((p) => p.lampRole === 'pool')!.mat,
      )
    })

    it('sits inside the desk footprint, on the desk top, clear of the other desk items', () => {
      const clutter = deskParts(desk.box, desk.height)
        .map(extent)
        .filter((e) => e.minY >= top - 1e-6)
      const tapes = prop('tape-stack').box
      clutter.push({ minX: tapes.minX, maxX: tapes.maxX, minZ: tapes.minZ, maxZ: tapes.maxZ, minY: top, maxY: top + 0.15 })
      expect(clutter.length).toBeGreaterThan(10)
      for (const { id } of DESK_LAMPS) {
        const lamp = prop(id)
        expect(lamp.solid).toBe(false)
        expect(lamp.box.minX).toBeGreaterThanOrEqual(desk.box.minX)
        expect(lamp.box.maxX).toBeLessThanOrEqual(desk.box.maxX)
        expect(lamp.box.minZ).toBeGreaterThanOrEqual(desk.box.minZ)
        expect(lamp.box.maxZ).toBeLessThanOrEqual(desk.box.maxZ)
        for (const p of lampParts(id, true)) {
          const e = extent(p)
          expect(e.minY, `${id} ${p.geo}/${p.mat}`).toBeGreaterThanOrEqual(top - 1e-6)
          if (p.lampRole === 'sprite') continue
          expect(e.minX).toBeGreaterThanOrEqual(desk.box.minX)
          expect(e.maxX).toBeLessThanOrEqual(desk.box.maxX)
          expect(e.minZ).toBeGreaterThanOrEqual(desk.box.minZ)
          expect(e.maxZ).toBeLessThanOrEqual(desk.box.maxZ)
        }
        for (const p of body(lampParts(id, true))) {
          const e = extent(p)
          for (const c of clutter) expect(overlaps(e, c), `${id} ${p.geo}/${p.mat} overlaps a desk item`).toBe(false)
          // The lamp body stays inside its own layout footprint.
          expect(e.minX).toBeGreaterThanOrEqual(lamp.box.minX - 1e-6)
          expect(e.maxX).toBeLessThanOrEqual(lamp.box.maxX + 1e-6)
          expect(e.minZ).toBeGreaterThanOrEqual(lamp.box.minZ - 1e-6)
          expect(e.maxZ).toBeLessThanOrEqual(lamp.box.maxZ + 1e-6)
        }
        // The two lamps do not overlap each other.
        const other = DESK_LAMPS.find((l) => l.id !== id)!.id
        for (const p of lampParts(id, true).filter((q) => q.lampRole !== 'sprite')) {
          for (const q of lampParts(other, true).filter((r) => r.lampRole !== 'sprite')) expect(overlaps(extent(p), extent(q))).toBe(false)
        }
      }
    })

    it('puts the light pool decal at least 2 mm above the desk top, flat and facing up', () => {
      expect(LAMP_POOL_LIFT).toBeGreaterThanOrEqual(0.002)
      for (const { id } of DESK_LAMPS) {
        const pool = lampParts(id, true).find((p) => p.lampRole === 'pool')!
        expect(pool.geo).toBe('disc')
        expect(pool.pos[1] - top).toBeGreaterThanOrEqual(0.002 - 1e-9)
        expect(pool.pos[1] - top).toBeLessThan(0.01)
        expect(pool.rot).toEqual([-Math.PI / 2, 0, 0])
        expect(materials.lampPool.polygonOffset).toBe(true)
      }
    })

    it('counts the sprite and pool discs as 24 triangles each and keeps the budgets', () => {
      const report = sceneDetailReport()
      const BASELINE_TRIANGLES = 19172 // before task 23.1
      for (const { id } of DESK_LAMPS) {
        const parts = lampParts(id, true)
        const planes = parts.filter((p) => p.lampRole === 'sprite' || p.lampRole === 'pool')
        expect(planes.every((p) => GEOMETRY_TRIANGLES[p.geo] === 24)).toBe(true)
        // Lit and unlit lamps cost the same.
        expect(parts.reduce((n, p) => n + GEOMETRY_TRIANGLES[p.geo], 0)).toBe(lampParts(id, false).reduce((n, p) => n + GEOMETRY_TRIANGLES[p.geo], 0))
        expect(report.objects.map((o) => o.name)).toContain(id)
      }
      expect(report.totalTriangles).toBeLessThan(SCENE_TRIANGLE_BUDGET)
      expect(report.totalTriangles - BASELINE_TRIANGLES).toBeLessThanOrEqual(80 + TASK_35_1_TRIANGLES)
      console.info(
        `[23.1] triangles ${report.totalTriangles} (delta ${report.totalTriangles - BASELINE_TRIANGLES}), draw-call estimate ${report.totalDrawCalls}, ` +
          `texture memory ${(report.textureMemoryBytes / 1048576).toFixed(3)} MiB`,
      )
      expect(M3_LIGHT_COUNT).toBe(4)
      expect(report.textureMemoryBytes).toBeLessThanOrEqual(7.55 * 1048576 + TASK_27_1_TEXTURE_BYTES)
      expect(report.textureMemoryBytes).toBeLessThanOrEqual(TEXTURE_MEMORY_BUDGET_BYTES)
    })

    it('task 24.1: each lamp has an additive open light cone from the shade rim to the desk top', () => {
      for (const { id } of DESK_LAMPS) {
        const cone = lampParts(id, true).find((p) => p.lampRole === 'cone')!
        expect(cone.geo).toBe('lampCone')
        expect(GEOMETRY_TRIANGLES[cone.geo]).toBe(48)
        const e = extent(cone)
        expect(e.minY).toBeGreaterThan(top)
        expect(e.minY).toBeLessThan(top + 0.01)
        expect(e.maxY).toBeGreaterThan(top + 0.2)
        expect(e.maxY).toBeLessThan(top + 0.26)
        // The cone stays inside the desk top.
        expect(e.minX).toBeGreaterThanOrEqual(desk.box.minX)
        expect(e.maxX).toBeLessThanOrEqual(desk.box.maxX)
        expect(e.minZ).toBeGreaterThanOrEqual(desk.box.minZ)
        expect(e.maxZ).toBeLessThanOrEqual(desk.box.maxZ)
      }
      for (const m of [materials.lampConeBanker, materials.lampConeTable]) {
        expect(m.type).toBe('MeshBasicMaterial')
        expect(m.blending).toBe(2) // AdditiveBlending
        expect(m.depthWrite).toBe(false)
        expect(m.transparent).toBe(true)
        expect(m.side).toBe(2) // DoubleSide
        expect(m.opacity).toBeCloseTo(0.2, 5) // 25.1: raised from 0.14 to compensate for the coneFalloff map
      }
      expect(materials.lampConeBanker.color.getHexString()).not.toBe(materials.lampConeTable.color.getHexString())
    })

    it('task 24.1: the pool is additive with a negative polygon offset, 2 mm above the desk and fully inside the desk top', () => {
      for (const m of [materials.lampPool, materials.lampPoolBanker]) {
        expect(m.blending).toBe(2)
        expect(m.depthWrite).toBe(false)
        expect(m.polygonOffset).toBe(true)
        expect(m.polygonOffsetFactor).toBeLessThan(0)
        expect(m.polygonOffsetUnits).toBeLessThan(0)
      }
      expect(materials.lampPool.color.getHexString()).not.toBe(materials.lampPoolBanker.color.getHexString())
      for (const { id } of DESK_LAMPS) {
        const pool = lampParts(id, true).find((p) => p.lampRole === 'pool')!
        expect(pool.pos[1] - top).toBeCloseTo(0.002, 9)
        const half = pool.scale[0] / 2
        expect(pool.pos[0] - half).toBeGreaterThanOrEqual(desk.box.minX - 1e-9)
        expect(pool.pos[0] + half).toBeLessThanOrEqual(desk.box.maxX + 1e-9)
        expect(pool.pos[2] - half).toBeGreaterThanOrEqual(desk.box.minZ - 1e-9)
        expect(pool.pos[2] + half).toBeLessThanOrEqual(desk.box.maxZ + 1e-9)
        // 30.1: the radius is capped by the distance from the lamp axis to the nearest desk edge, and the centre is not moved.
        expect(half).toBeGreaterThan(0.15)
        expect(half).toBeLessThanOrEqual(LAMP_POOL_RADIUS_WANTED)
      }
      const fit = lampPoolPlacement(desk.box, -1.31, 1.45)
      expect(fit.cx).toBe(-1.31)
      expect(fit.cz).toBe(1.45)
      expect(fit.radius).toBeCloseTo(0.19, 9)
    })

    it('task 30.1: no glow, pool or sprite part is a quad; their geometries have at least 24 radial segments', () => {
      for (const { id } of DESK_LAMPS) {
        const parts = lampParts(id, true)
        const glow = parts.filter((p) => p.lampRole === 'sprite' || p.lampRole === 'pool' || p.lampRole === 'cone' || (id === 'desk-lamp-right' && p.lampRole === 'inner'))
        expect(glow.length).toBeGreaterThanOrEqual(2)
        for (const p of glow) {
          expect(p.geo, `${id} ${p.lampRole}`).not.toBe('plane')
          const g = geometries[p.geo] as unknown as { parameters: { segments?: number; radialSegments?: number; openEnded?: boolean } }
          expect(g.parameters.segments ?? g.parameters.radialSegments, `${id} ${p.lampRole}`).toBeGreaterThanOrEqual(24)
          if (p.lampRole === 'cone') expect(g.parameters.openEnded).toBe(true)
        }
        expect(parts.filter((p) => p.lampRole === 'pool' || p.lampRole === 'sprite').every((p) => p.geo === 'disc')).toBe(true)
      }
      for (const m of [materials.lampHalo, materials.lampPool, materials.lampPoolBanker, materials.lampConeBanker, materials.lampConeTable]) {
        expect(m.transparent).toBe(true)
        expect(m.depthWrite).toBe(false)
      }
    })

    it('task 30.1: the table lamp inner glow stays inside the cream shade (no corner pokes out)', () => {
      const parts = lampParts('desk-lamp-right', true)
      const inner = parts.find((p) => p.lampRole === 'inner')!
      expect(inner.geo).toBe('disc')
      // Shade radius at the inner glow height: linear from 0.12 m at y 0.22 to 0.072 m at y 0.38 (bottom 0.5 and top 0.3 of scale 0.24).
      const y = inner.pos[1] - top
      const shadeRadius = 0.12 - ((y - 0.22) / 0.16) * (0.12 - 0.072)
      expect(inner.scale[0] / 2).toBeLessThan(shadeRadius * Math.cos(Math.PI / 12)) // inside the 12-sided shade apothem
    })

    it('task 30.1: each cone is open, has 24+ segments, starts inside the shade (top radius < opening, top y between rim and bulb) and ends at the desk', () => {
      for (const { id, kind } of DESK_LAMPS) {
        const parts = lampParts(id, true)
        const cone = parts.find((p) => p.lampRole === 'cone')!
        const shade = LAMP_SHADE_OPENING[kind]
        const topRadius = (cone.scale[0] * 0.25)
        expect(topRadius, id).toBeLessThan(shade.radius)
        expect(topRadius, id).toBeGreaterThanOrEqual(shade.radius * 0.85 - 1e-9)
        expect(topRadius, id).toBeLessThanOrEqual(shade.radius * 0.9)
        const topY = cone.pos[1] + cone.scale[1] / 2 - top
        expect(topY).toBeCloseTo(LAMP_CONE_TOP_Y[kind], 9)
        expect(topY).toBeGreaterThan(shade.rimY)
        const bulb = parts.find((p) => p.lampRole === 'bulb')!
        expect(topY).toBeLessThan(bulb.pos[1] - top)
        expect(cone.pos[1] - cone.scale[1] / 2 - top).toBeGreaterThan(0)
        expect(cone.pos[1] - cone.scale[1] / 2 - top).toBeLessThan(0.01)
        // The cone's radius where it passes the shade rim is still inside the opening.
        const rimR = topRadius + (topRadius * 1) * ((topY - shade.rimY) / (cone.scale[1]))
        expect(rimR).toBeLessThan(shade.radius)
      }
      // Banker opening is the hood underside: 0.13 m deep roof minus two 0.012 m skirts, half = 0.053 m.
      const hood = lampParts('desk-lamp-left', true).filter((p) => p.lampRole === 'shade')
      const roof = hood[0]
      expect(LAMP_SHADE_OPENING.banker.radius).toBeCloseTo(roof.scale[2] / 2 - 0.012, 9)
    })

    it('task 30.1: the pool is a flat horizontal disc 2 mm above the desk, centred under the shade and inside the desk top', () => {
      for (const { id } of DESK_LAMPS) {
        const parts = lampParts(id, true)
        const pool = parts.find((p) => p.lampRole === 'pool')!
        const cone = parts.find((p) => p.lampRole === 'cone')!
        expect(pool.geo).toBe('disc')
        expect(pool.rot).toEqual([-Math.PI / 2, 0, 0])
        expect(pool.pos[1] - top).toBeCloseTo(0.002, 9)
        expect(Math.abs(pool.pos[0] - cone.pos[0])).toBeLessThan(0.001)
        expect(Math.abs(pool.pos[2] - cone.pos[2])).toBeLessThan(0.001)
        const r = pool.scale[0] / 2
        expect(pool.pos[0] - r).toBeGreaterThanOrEqual(desk.box.minX - 1e-9)
        expect(pool.pos[0] + r).toBeLessThanOrEqual(desk.box.maxX + 1e-9)
        expect(pool.pos[2] - r).toBeGreaterThanOrEqual(desk.box.minZ - 1e-9)
        expect(pool.pos[2] + r).toBeLessThanOrEqual(desk.box.maxZ + 1e-9)
        console.info(`[30.1] ${id} pool radius ${r.toFixed(3)} m`)
      }
    })

    it('task 30.1: OFF hides cone, pool and sprite and every glow geometry is disposed once', () => {
      for (const { id } of DESK_LAMPS) {
        for (const p of lampParts(id, false).filter((q) => q.lampRole === 'cone' || q.lampRole === 'pool' || q.lampRole === 'sprite')) {
          expect(materials[p.mat].visible, `${id} ${p.lampRole}`).toBe(false)
        }
      }
      const spies = [geometries.disc, geometries.lampCone].map((g) => vi.spyOn(g, 'dispose'))
      disposeSharedResources()
      for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    })

    it('task 30.1: total triangles stay within the 20,000 cap and the lamp rework costs +38 (19,116 -> 19,154)', () => {
      const report = sceneDetailReport()
      console.info(`[30.1] triangles ${report.totalTriangles} (delta ${TASK_30_1_TRIANGLES} from 19116)`)
      expect(report.totalTriangles).toBeLessThanOrEqual(TRIANGLE_CAP)
      expect(report.totalTriangles).toBe(19116 + TASK_30_1_TRIANGLES + TASK_33_1_TRIANGLES + TASK_34_1_TRIANGLES + TASK_35_1_TRIANGLES)
      expect(M3_LIGHT_COUNT).toBe(4)
      expect(report.textureCount).toBe(32)
      expect(report.textureMemoryBytes / 1048576).toBeCloseTo(7.703, 3)
    })

    it('task 24.1: ON shades are emissive with the exact colours and intensities, OFF shades are dark with emissiveIntensity 0', () => {
      expect(materials.lampGreenShadeOn.emissive.getHexString()).toBe('16a34a') // 25.1: was #22c55e at 0.75
      expect(materials.lampGreenShadeOn.emissiveIntensity).toBe(0.38)
      expect(materials.lampCreamShadeOn.emissive.getHexString()).toBe('ffd27d')
      expect(materials.lampCreamShadeOn.emissiveIntensity).toBe(0.85)
      expect(materials.lampGreenShade.emissiveIntensity).toBe(0)
      expect(materials.lampCreamShade.emissiveIntensity).toBe(0)
      for (const m of [materials.lampGreenShadeOn, materials.lampCreamShadeOn, materials.lampGreenShade, materials.lampCreamShade]) expect(m.type).toBe('MeshLambertMaterial')
      // Lit and unlit pairs are distinct objects per lamp.
      expect(materials.lampGreenShadeOn).not.toBe(materials.lampGreenShade)
      expect(materials.lampCreamShadeOn).not.toBe(materials.lampCreamShade)
      const lum = (m: { color: { r: number; g: number; b: number } }) => m.color.r + m.color.g + m.color.b
      expect(lum(materials.lampGreenShade)).toBeLessThan(lum(materials.lampGreenShadeOn))
      expect(lum(materials.lampCreamShade)).toBeLessThan(lum(materials.lampCreamShadeOn))
      const shadeMats = (id: string, on: boolean) => new Set(lampParts(id, on).filter((p) => p.lampRole === 'shade').map((p) => p.mat))
      expect([...shadeMats('desk-lamp-left', true)]).toEqual(['lampGreenShadeOn'])
      expect([...shadeMats('desk-lamp-right', true)]).toEqual(['lampCreamShadeOn'])
      expect([...shadeMats('desk-lamp-left', false)]).toEqual(['lampGreenShade'])
      expect([...shadeMats('desk-lamp-right', false)]).toEqual(['lampCreamShade'])
      // OFF: cone, pool and sprite use the never-drawn material.
      for (const id of DESK_LAMPS.map((l) => l.id)) {
        for (const role of ['cone', 'pool', 'sprite'] as const) {
          const found = lampParts(id, false).find((p) => p.lampRole === role)
          if (!found) continue // the table lamp has no sprite (30.1)
          const mat = found.mat
          expect(materials[mat].visible, `${id} ${role}`).toBe(false)
        }
      }
    })

    it('task 24.1: every ceiling fixture has a 2-triangle additive bloom strip just below its tube', () => {
      const centres = fixtureCentres()
      expect(centres.length).toBeGreaterThanOrEqual(2)
      for (const [x, z] of centres) {
        const parts = ceilingFixtureParts(x, z)
        const bloom = parts.filter((p) => p.mat === 'ceilingBloom')
        expect(bloom).toHaveLength(1)
        expect(GEOMETRY_TRIANGLES[bloom[0].geo]).toBe(2)
        const tube = parts.find((p) => p.mat === 'fluorescent')!
        expect(bloom[0].pos[1]).toBeLessThan(tube.pos[1] - tube.scale[1] / 2)
        expect(bloom[0].pos[1]).toBeCloseTo(ROOM.height - CEILING_BLOOM_DROP, 9)
        expect(bloom[0].rot).toEqual([Math.PI / 2, 0, 0])
        expect(bloom[0].scale[0]).toBeGreaterThan(FIXTURE_LENGTH)
      }
      const m = materials.ceilingBloom
      expect(m.blending).toBe(2)
      expect(m.depthWrite).toBe(false)
      expect(m.transparent).toBe(true)
      expect(m.opacity).toBeLessThanOrEqual(0.25)
    })

    it('task 24.1: budgets hold (triangles delta from 19,042 at most +70, 4 lights, same texture count and memory) and textures dispose once', () => {
      const report = sceneDetailReport()
      expect(report.totalTriangles).toBeLessThan(SCENE_TRIANGLE_BUDGET)
      expect(report.totalTriangles - 19042).toBeLessThanOrEqual(82 + TASK_26_1_TRIANGLES + TASK_34_1_TRIANGLES + TASK_35_1_TRIANGLES) // 25.1 adds 18 (caps +16, liner +2); 25.2 adds 6 (three glow decals)
      expect(report.totalTriangles - 19042).toBe(82 + TASK_26_1_TRIANGLES + TASK_27_1_TRIANGLES + TASK_28_2_TRIANGLES + TASK_30_1_TRIANGLES + TASK_33_1_TRIANGLES + TASK_34_1_TRIANGLES + TASK_35_1_TRIANGLES)
      expect(report.textureCount).toBe(32)
      expect(report.textureMemoryBytes / 1048576).toBeCloseTo(7.537 + TASK_27_1_TEXTURE_BYTES / 1048576, 2) // 7.521 + coneFalloff 0.016
      expect(report.textureMemoryBytes).toBeLessThanOrEqual(8 * 1048576)
      expect(M3_LIGHT_COUNT).toBe(4)
      console.info(
        `[24.1] triangles ${report.totalTriangles} (delta ${report.totalTriangles - 19042}), draw-call estimate ${report.totalDrawCalls}, ` +
          `texture memory ${(report.textureMemoryBytes / 1048576).toFixed(3)} MiB`,
      )
      setCanvasFactory(() => fakeCanvas())
      ensureSharedTextures()
      const spies = TEXTURE_IDS.map((id) => vi.spyOn(getSharedTexture(id)!, 'dispose'))
      expect(materials.lampPoolBanker.map).toBe(getSharedTexture('lampGlow'))
      expect(materials.ceilingBloom.map).toBe(getSharedTexture('lampGlow'))
      disposeSharedResources()
      disposeSharedResources()
      for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    })

    it('disposes lampGlow exactly once and keeps the pool and sprite bound to it', () => {
      setCanvasFactory(() => fakeCanvas())
      ensureSharedTextures()
      const glow = getSharedTexture('lampGlow')!
      expect(materials.lampHalo.map).toBe(glow)
      expect(materials.lampPool.map).toBe(glow)
      const spy = vi.spyOn(glow, 'dispose')
      disposeSharedResources()
      expect(spy).toHaveBeenCalledTimes(1)
      disposeSharedResources()
      expect(spy).toHaveBeenCalledTimes(1)
      expect(materials.lampPool.map).toBeNull()
    })
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
    // 21 textures after 18.3; task 20.2 removed four (arcadeScreen, marquee, outOfOrder, deck) and added six; task 21.1 added couchFabric.
    // Task 21.2 adds crtCasing and crtGlass; 22.1 adds vcrDeck and vhsShell, 22.2 adds metalCabinet (A) and deskDetail (B).
    expect(report.textureCount).toBe(32)
    for (const name of ['conduit', 'ventilation', 'cable-loops', 'corner-posts', 'wall-clock', 'desk-lamp-left', 'desk-lamp-right']) {
      expect(report.objects.map((o) => o.name)).toContain(name)
    }
  })
})

describe('task 19.2: texture headroom and craftsmanship', () => {
  afterEach(() => setCanvasFactory(null))

  const extentOf = (p: Part) => {
    const size: Vec3 = p.geo === 'plane' || p.geo === 'disc' ? [p.scale[0], p.scale[1], 0] : p.scale
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

  it('wallPanel is 256 x 256 and the texture memory estimate dropped below 7 MB', () => {
    const wall = TEXTURE_SPECS.wallPanel
    expect([wall.width, wall.height]).toEqual([256, 256])
    const report = sceneDetailReport()
    const perTexture = TEXTURE_IDS.map((id) => `${id} ${TEXTURE_SPECS[id].width}x${TEXTURE_SPECS[id].height}=${(textureMemoryBytes(TEXTURE_SPECS[id]) / 1048576).toFixed(2)}MB`)
    console.info(
      `[19.2] computed triangles: ${report.totalTriangles} (detail ${report.detailTriangles} + base ${report.baseTriangles}), draw-call estimate ${report.totalDrawCalls}, ` +
        `textures ${report.textureCount}, texture memory estimate ${(report.textureMemoryBytes / 1048576).toFixed(2)} MB (computed, not runtime-measured): ${perTexture.join(', ')}`,
    )
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(TEXTURE_MEMORY_BUDGET_BYTES)
    // 7.0 MB after 19.2; task 21.1 adds couchFabric (0.33 MB), so the headroom check is now 7.5 MB (budget stays 8 MB).
    // Task 21.2 adds crtCasing (0.33 MB) and crtGlass (0.25 MB): the headroom check was 7.7 MB.
    // Task 22.1 shrinks corkBoard to 256x256 (-1.00 MB) and adds vcrDeck and vhsShell (+0.25 MB): now 7.0 MB.
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(7.7 * 1048576 + TASK_27_1_TEXTURE_BYTES)
    expect(report.totalTriangles).toBeLessThan(SCENE_TRIANGLE_BUDGET)
    expect(report.totalDrawCalls).toBeLessThan(DRAW_CALL_CAP)
    expect(report.textureCount).toBe(TEXTURE_IDS.length)
  })

  it('the reference monitor uses the smpte material, separate from the shared crtScreen', () => {
    const crt = prop('crt-vhs')
    const monitor = referenceMonitorParts(crt.box)
    expect(monitor.filter((p) => p.mat === 'smpteScreen')).toHaveLength(1)
    expect(monitor.some((p) => p.mat === 'crtScreen')).toBe(false)
    expect(materials.smpteScreen).not.toBe(materials.crtScreen)
    expect(materials.smpteScreen.type).toBe('MeshBasicMaterial')
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    expect(materials.smpteScreen.map).toBe(getSharedTexture('smpteBars'))
    expect(getSharedTexture('smpteBars')?.magFilter).toBe(1003) // NearestFilter
    expect(getSharedTexture('smpteBars')?.colorSpace).toBe('srgb')
    // Dimmed: its colour multiplier is darker than white, and the shared CRT is not bound to this texture.
    expect(materials.smpteScreen.color.r).toBeLessThan(1)
    // Since 21.2 the shared CRT carries its own crtGlass texture, never the reference card's bars.
    expect(materials.crtScreen.map).toBe(getSharedTexture('crtGlass'))
    expect(materials.crtScreen.map).not.toBe(materials.smpteScreen.map)
  })

  it('the old out-of-order glass, single arcade screen, marquee and deck materials and textures are gone', () => {
    const removedMaterials = ['outOfOrderScreen', 'arcadeScreen', 'marquee', 'deck']
    for (const o of declaredObjects()) {
      expect(o.parts.some((p) => removedMaterials.includes(p.mat)), o.name).toBe(false)
    }
    for (const key of removedMaterials) expect(key in materials, key).toBe(false)
    for (const id of ['outOfOrder', 'arcadeScreen', 'marquee', 'deck']) expect(TEXTURE_IDS as string[], id).not.toContain(id)
  })

  it('the VCR has a glowing timecode window and a metallic tape slot', () => {
    const crt = prop('crt-vhs')
    const parts = vcrDeckParts(crt.box)
    const tc = parts.filter((p) => p.mat === 'timecode')
    expect(tc).toHaveLength(1)
    expect(tc[0].geo).toBe('plane')
    // The 128 x 32 texture is 4:1 and the plane keeps that ratio.
    expect(tc[0].scale[0] / tc[0].scale[1]).toBeCloseTo(4)
    expect(parts.filter((p) => p.mat === 'tapeSlotMetal').length).toBeGreaterThanOrEqual(2)
    expect(materials.timecode.type).toBe('MeshBasicMaterial')
    expect(materials.tapeSlotMetal.type).toBe('MeshStandardMaterial')
    expect(materials.tapeSlotMetal.metalness).toBeGreaterThanOrEqual(0.6)
    expect(materials.tapeSlotMetal.metalness).toBeLessThanOrEqual(0.8)
    expect(materials.tapeSlotMetal.roughness).toBeCloseTo(0.35, 1)
    // Everything stays on the VCR's front, inside the console footprint.
    for (const p of [...tc, ...parts.filter((q) => q.mat === 'tapeSlotMetal')]) {
      expect(p.pos[0]).toBeGreaterThan(crt.box.minX)
      expect(p.pos[0]).toBeLessThan(crt.box.maxX)
      expect(p.pos[1]).toBeLessThan(CONSOLE_TOP - 0.1)
    }
  })

  it('without a canvas the new materials keep flat colours', () => {
    setCanvasFactory(null)
    ensureSharedTextures()
    for (const m of [materials.smpteScreen, materials.timecode]) expect(m.map).toBeNull()
    expect(getSharedTexture('smpteBars')).toBeNull()
    expect(getSharedTexture('timecode')).toBeNull()
  })

  it('routes black, grey and one red cable behind the console, inside its footprint plus 5 cm', () => {
    const crt = prop('crt-vhs')
    const cables = consoleCableParts(crt.box)
    expect(cables.length).toBeGreaterThan(10)
    expect(cables.every((p) => p.geo === 'cylinderLow')).toBe(true)
    const mats = new Set(cables.map((p) => p.mat))
    expect([...mats].sort()).toEqual(['cableBlack', 'cableGrey', 'cableRed'])
    // One red cable: its segments form a single connected run.
    const red = cables.filter((p) => p.mat === 'cableRed')
    expect(red.length).toBeGreaterThan(3)
    const room = ROOM.bounds
    for (const p of cables) {
      const e = extentOf(p)
      const where = `${p.mat} at ${p.pos.join(',')}`
      expect(e.minX, where).toBeGreaterThanOrEqual(crt.box.minX - 0.05)
      expect(e.maxX, where).toBeLessThanOrEqual(crt.box.maxX + 0.05)
      expect(e.minZ, where).toBeGreaterThanOrEqual(crt.box.minZ - 0.05)
      expect(e.maxZ, where).toBeLessThanOrEqual(crt.box.maxZ + 0.05)
      expect(e.minY, where).toBeGreaterThanOrEqual(0)
      expect(e.maxY, where).toBeLessThan(crt.height)
      expect(e.minX).toBeGreaterThan(room.minX)
      expect(e.maxX).toBeLessThan(room.maxX)
      expect(e.minZ).toBeGreaterThan(room.minZ)
    }
    // Some run along the top and some down the back.
    expect(cables.some((p) => Math.abs(p.pos[1] - 0.74) < 0.06)).toBe(true)
    expect(cables.some((p) => p.pos[1] < 0.4 && p.pos[2] < crt.box.minZ)).toBe(true)
    expect(declaredObjects().map((o) => o.name)).toContain('console-cables')
  })

  it('cable segments follow their path: each cylinder axis points from one path point to the next', () => {
    // A straight horizontal run along +x must have its Y axis rotated onto +x.
    const [seg] = cablePathParts([[0, 1, 0], [1, 1, 0]], 'cableBlack', 0.02).filter((p) => p.scale[1] > 0.2)
    const rot = seg.rot!
    const o = new Object3D()
    o.rotation.set(rot[0], rot[1], rot[2])
    o.updateMatrix()
    const axis = [o.matrix.elements[4], o.matrix.elements[5], o.matrix.elements[6]]
    expect(axis[0]).toBeCloseTo(1, 5)
    expect(axis[1]).toBeCloseTo(0, 5)
    expect(axis[2]).toBeCloseTo(0, 5)
    // A diagonal in the xz plane.
    const [d] = cablePathParts([[0, 0, 0], [1, 0.5, -1]], 'cableBlack', 0.02).filter((p) => p.scale[1] > 0.4)
    const o2 = new Object3D()
    o2.rotation.set(d.rot![0], d.rot![1], d.rot![2])
    o2.updateMatrix()
    const len = Math.hypot(1, 0.5, 1)
    expect(o2.matrix.elements[4]).toBeCloseTo(1 / len, 5)
    expect(o2.matrix.elements[5]).toBeCloseTo(0.5 / len, 5)
    expect(o2.matrix.elements[6]).toBeCloseTo(-1 / len, 5)
  })

  it('wood boxes get metric UVs: the grain span is length / 0.6 m along the longest axis', () => {
    const dims = [1.2, 0.03, 0.3] as const
    const g = woodBoxGeometry(...dims)
    expect(woodBoxGeometry(...dims)).toBe(g)
    const uv = g.getAttribute('uv')
    // In-plane edge lengths per face (+x, -x, +y, -y, +z, -z).
    const edges = [[0.3, 0.03], [0.3, 0.03], [1.2, 0.3], [1.2, 0.3], [1.2, 0.03], [1.2, 0.03]]
    for (let f = 0; f < 6; f++) {
      const us = [0, 1, 2, 3].map((k) => uv.getX(f * 4 + k))
      const vs = [0, 1, 2, 3].map((k) => uv.getY(f * 4 + k))
      const du = Math.max(...us) - Math.min(...us)
      const dv = Math.max(...vs) - Math.min(...vs)
      const [long, short] = edges[f]
      // Grain (u) follows the face's longer edge; both spans are proportional to the real length.
      expect(du, `face ${f} u`).toBeCloseTo(long / WOOD_METRES_PER_REPEAT, 6)
      expect(dv, `face ${f} v`).toBeCloseTo(short / WOOD_METRES_PER_REPEAT, 6)
    }
    // The long faces span 2 repeats along the board.
    expect(Math.max(...[16, 17, 18, 19].map((i) => uv.getX(i))) - Math.min(...[16, 17, 18, 19].map((i) => uv.getX(i)))).toBeCloseTo(2, 6)
    // A board whose longest axis is Y (a side panel) runs the grain vertically: u spans the height.
    const side = woodBoxGeometry(0.045, 1.8, 0.3).getAttribute('uv')
    const sideFront = [16, 17, 18, 19].map((i) => ({ u: side.getX(i), v: side.getY(i) }))
    const span = (k: 'u' | 'v') => Math.max(...sideFront.map((p) => p[k])) - Math.min(...sideFront.map((p) => p[k]))
    expect(span('u')).toBeCloseTo(1.8 / WOOD_METRES_PER_REPEAT, 6)
    expect(span('v')).toBeCloseTo(0.045 / WOOD_METRES_PER_REPEAT, 6)
  })

  it('long boards are flagged metric, grouped by size, and keep the geometry count small', () => {
    const sizes = new Set<string>()
    for (const id of SHELF_IDS) {
      const p = prop(id)
      const parts = shelfFrameParts(p.box, p.height)
      expect(parts.every((q) => q.metric === true)).toBe(true)
      for (const q of parts) sizes.add(partGroupKey(q))
      // Draw groups per bookcase stay small (boards and side panels of equal size are instanced).
      expect(new Set(parts.map(partGroupKey)).size).toBeLessThanOrEqual(10)
    }
    expect(sizes.size).toBeLessThan(SHELF_IDS.length * 10)
    const desk = prop('reception-desk')
    const dp = deskParts(desk.box, desk.height)
    expect(dp.filter((q) => q.metric).length).toBe(2)
    expect(dp.filter((q) => q.metric && q.mat === 'wood')[0].scale[0]).toBeGreaterThan(2)
    const console_ = mediaConsoleParts(prop('crt-vhs').box)
    expect(console_.filter((q) => q.metric)).toHaveLength(1)
    // Non-board parts and rotated books never use the metric path.
    expect(consoleTapeParts(prop('crt-vhs').box).some((q) => q.metric)).toBe(false)
    // Real size scale is kept, so every layout assertion on `scale` still holds.
    expect(partGroupKey({ geo: 'box', mat: 'wood', pos: [0, 0, 0], scale: [1, 2, 3] })).toBe('box|wood')
  })

  it('disposes every cached wood geometry once, twice-safe, and rebuilds afterwards', () => {
    const g = woodBoxGeometry(0.5, 0.05, 0.2)
    const h = woodBoxGeometry(0.7, 0.03, 0.2)
    expect(woodBoxCount()).toBeGreaterThanOrEqual(2)
    const spies = [g, h].map((x) => vi.spyOn(x, 'dispose'))
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(woodBoxCount()).toBe(0)
    expect(() => disposeSharedResources()).not.toThrow()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(woodBoxGeometry(0.5, 0.05, 0.2)).not.toBe(g)
  })

  it('each new texture is created once and disposed exactly once, twice-safe', () => {
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    const ids = ['smpteBars', 'timecode', 'wallPanel'] as const
    const spies = ids.map((id) => vi.spyOn(getSharedTexture(id)!, 'dispose'))
    expect(materials.timecode.map).toBe(getSharedTexture('timecode'))
    expect(liveTextureCount()).toBe(TEXTURE_IDS.length)
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(materials.smpteScreen.map).toBeNull()
    expect(materials.timecode.map).toBeNull()
    expect(() => disposeSharedResources()).not.toThrow()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
  })

  it('still adds no light and does not change colliders', () => {
    expect(M3_LIGHT_COUNT).toBe(4)
    const solid = ROOM.props.filter((p) => p.solid).map((p) => p.box)
    expect(COLLIDERS).toEqual([...ROOM.walls, ...ROOM.doors.flatMap((d) => d.frames), ...solid])
  })
})

describe('task 20.2: attract screen and marquee textures on the cabinets', () => {
  afterEach(() => setCanvasFactory(null))

  const SCREEN_TEXTURES = { snake: 'attractSnake', maze: 'attractMaze', frequency: 'attractFrequency' } as const
  const MARQUEE_TEXTURES = { snake: 'marqueeSnake', maze: 'marqueeMaze', frequency: 'marqueeFrequency' } as const
  const GAMES = ['snake', 'maze', 'frequency'] as const

  it('with a canvas each cabinet screen and marquee material shows its own texture', () => {
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    const seen = new Set<unknown>()
    for (const game of GAMES) {
      const style = ARCADE_CABINET_STYLES[game]
      const screenTex = getSharedTexture(SCREEN_TEXTURES[game])
      const marqueeTex = getSharedTexture(MARQUEE_TEXTURES[game])
      expect(screenTex).not.toBeNull()
      expect(marqueeTex).not.toBeNull()
      expect(materials[style.screen].map).toBe(screenTex)
      expect(materials[style.marquee].map).toBe(marqueeTex)
      // White multiplier: the art shows unmodified at t = 0.
      expect(materials[style.screen].color.getHexString()).toBe('ffffff')
      expect(materials[style.marquee].color.getHexString()).toBe('ffffff')
      expect([screenTex?.image.width, screenTex?.image.height]).toEqual([256, 256])
      expect([marqueeTex?.image.width, marqueeTex?.image.height]).toEqual([256, 64])
      expect(screenTex?.colorSpace).toBe('srgb')
      expect(marqueeTex?.colorSpace).toBe('srgb')
      expect(screenTex?.generateMipmaps).toBe(false)
      expect(screenTex?.magFilter).toBe(1003) // NearestFilter
      seen.add(screenTex)
      seen.add(marqueeTex)
    }
    expect(seen.size).toBe(6)
  })

  it('without a canvas the screens and marquees keep their flat game colours', () => {
    setCanvasFactory(null)
    ensureSharedTextures()
    for (const game of GAMES) {
      const style = ARCADE_CABINET_STYLES[game]
      expect(materials[style.screen].map).toBeNull()
      expect(materials[style.marquee].map).toBeNull()
      expect(materials[style.screen].color.getHexString()).toBe(ARCADE_SCREEN_BASE_COLORS[game].slice(1))
      expect(getSharedTexture(SCREEN_TEXTURES[game])).toBeNull()
      expect(getSharedTexture(MARQUEE_TEXTURES[game])).toBeNull()
    }
  })

  it('texture count and memory after the change, every texture disposed exactly once, twice-safe', () => {
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    // 23 after task 20.2, plus couchFabric (21.1), crtCasing and crtGlass (21.2).
    expect(liveTextureCount()).toBe(32)
    expect(TEXTURE_IDS).toHaveLength(32)
    const total = totalTextureMemoryBytes()
    const perTexture = TEXTURE_IDS.map((id) => `${id} ${TEXTURE_SPECS[id].width}x${TEXTURE_SPECS[id].height}=${(textureMemoryBytes(TEXTURE_SPECS[id]) / 1048576).toFixed(3)}MB`)
    const report = sceneDetailReport()
    console.info(
      `[20.2] computed triangles ${report.totalTriangles}, draw-call estimate ${report.totalDrawCalls}, textures ${report.textureCount}, ` +
        `texture memory estimate ${(total / 1048576).toFixed(3)} MB (computed, not runtime-measured): ${perTexture.join(', ')}`,
    )
    expect(total).toBeLessThanOrEqual(TEXTURE_MEMORY_BUDGET_BYTES)
    expect(report.textureMemoryBytes).toBe(total)
    expect(report.totalTriangles).toBeLessThan(SCENE_TRIANGLE_BUDGET)
    expect(report.totalTriangles).toBeLessThan(20000)
    const spies = TEXTURE_IDS.map((id) => vi.spyOn(getSharedTexture(id)!, 'dispose'))
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(liveTextureCount()).toBe(0)
    expect(() => disposeSharedResources()).not.toThrow()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
  })

  it('every cabinet part material is one of the per-game materials (no removed material is referenced)', () => {
    for (const id of ARCADE_CABINET_IDS) {
      const a = prop(id)
      const parts = arcadeCabinetParts(facingFrame(a.box, a.facing).local, a.height, ARCADE_CABINET_GAMES[id])
      for (const p of parts) expect(p.mat in materials, p.mat).toBe(true)
    }
  })
})

describe('task 21.1: couch pillow, cushion faces and upholstery texture', () => {
  afterEach(() => setCanvasFactory(null))

  const couch = prop('couch')
  const parts = () => couchParts(couch.box)
  const obbOf = (p: Part) => {
    const rot = new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromEuler(new Euler(...(p.rot ?? [0, 0, 0]))))
    return new OBB(new Vector3(...p.pos), new Vector3(p.scale[0] / 2, p.scale[1] / 2, p.scale[2] / 2), rot)
  }

  it('the throw pillow penetrates no other couch part, with at most 2 mm of contact gap on the seat', () => {
    const all = parts()
    const p = all.find((q) => q.mat === 'couchPillow')!
    const po = obbOf(p)
    const others = all.filter((q) => q !== p)
    for (const q of others) expect(po.intersectsOBB(obbOf(q), 1e-6), `${q.geo}/${q.mat} at ${q.pos.join(',')}`).toBe(false)
    // Sanity: the old, clipping transform (centre 0.52 m up, tilted [-0.4, 0.5, 0.3]) is detected as an intersection.
    const old: Part = { geo: 'box', mat: 'sideArtB', pos: [couch.box.minX + 0.42, 0.52, (couch.box.minZ + couch.box.maxZ) / 2 + 0.12], scale: [0.3, 0.3, 0.08], rot: [-0.4, 0.5, 0.3] }
    expect(others.some((q) => obbOf(old).intersectsOBB(obbOf(q), 1e-6))).toBe(true)
    // It rests on the seat: lowest point of the oriented box is 0..2 mm above the seat top.
    const half = orientedHalfExtents(p.scale, p.rot ?? [0, 0, 0])
    const lowest = p.pos[1] - half[1]
    expect(lowest).toBeGreaterThanOrEqual(COUCH_SEAT_TOP - 1e-9)
    expect(lowest - COUCH_SEAT_TOP).toBeLessThanOrEqual(0.002)
    // Against the armrest inner face (x = minX + 0.2), within 2 mm and not through it.
    expect(p.pos[0] - half[0] - (couch.box.minX + 0.2)).toBeGreaterThanOrEqual(0)
    expect(p.pos[0] - half[0] - (couch.box.minX + 0.2)).toBeLessThanOrEqual(0.002)
    // Inside the couch footprint and below the backrest top; leaning toward the backrest.
    expect(p.pos[0] + half[0]).toBeLessThan(couch.box.maxX)
    expect(p.pos[2] - half[2]).toBeGreaterThan(couch.box.minZ)
    expect(p.pos[2] + half[2]).toBeLessThan(couch.box.maxZ)
    expect(p.pos[1] + half[1]).toBeLessThan(0.9)
    expect(p.rot![0]).toBeGreaterThan(0)
  })

  it('the middle seat cushion has no dark patch part and no worn material remains', () => {
    expect(parts().some((q) => (q.mat as string) === 'rugWorn')).toBe(false)
    expect('rugWorn' in materials).toBe(false)
    // Every flat-coloured seat cushion part uses the one cushion material.
    expect(parts().filter((q) => q.scale[1] === 0.14).every((q) => q.mat === 'couchCushion')).toBe(true)
  })

  it('no two couch faces are coplanar, overlapping and facing the same way (no z-fighting)', () => {
    type Face = { axis: 0 | 1 | 2; sign: 1 | -1; at: number; lo: [number, number]; hi: [number, number]; name: string }
    const faces: Face[] = []
    for (const p of parts()) {
      if (p.rot && p.rot.some((r) => Math.abs(r) > 1e-9 && Math.abs(Math.abs(r) - Math.PI / 2) > 1e-9)) continue
      let ext: Vec3 = p.scale
      let capsOnly: 0 | 1 | 2 | null = null
      if (p.geo === 'cylinder' || p.geo === 'cylinderLow') {
        // Only the two caps are flat faces; the axis is local y, turned by a quarter turn.
        const [rx, , rz] = p.rot ?? [0, 0, 0]
        if (rx !== 0) {
          ext = [p.scale[0], p.scale[2], p.scale[1]]
          capsOnly = 2
        } else if (rz !== 0) {
          ext = [p.scale[1], p.scale[0], p.scale[2]]
          capsOnly = 0
        } else {
          capsOnly = 1
        }
      } else if (p.rot) continue
      for (const axis of [0, 1, 2] as const) {
        if (capsOnly !== null && axis !== capsOnly) continue
        const [a, b] = [0, 1, 2].filter((i) => i !== axis)
        for (const sign of [1, -1] as const) {
          faces.push({
            axis,
            sign,
            at: p.pos[axis] + (sign * ext[axis]) / 2,
            lo: [p.pos[a] - ext[a] / 2, p.pos[b] - ext[b] / 2],
            hi: [p.pos[a] + ext[a] / 2, p.pos[b] + ext[b] / 2],
            name: `${p.geo}/${p.mat}@${p.pos.map((v) => v.toFixed(3)).join(',')}`,
          })
        }
      }
    }
    expect(faces.length).toBeGreaterThan(30)
    for (let i = 0; i < faces.length; i++) {
      for (let j = i + 1; j < faces.length; j++) {
        const f = faces[i]
        const g = faces[j]
        if (f.axis !== g.axis || f.sign !== g.sign || Math.abs(f.at - g.at) >= 0.001) continue
        const ox = Math.min(f.hi[0], g.hi[0]) - Math.max(f.lo[0], g.lo[0])
        const oy = Math.min(f.hi[1], g.hi[1]) - Math.max(f.lo[1], g.lo[1])
        expect(ox > 1e-6 && oy > 1e-6, `${f.name} vs ${g.name}`).toBe(false)
      }
    }
  })

  it('stays inside its footprint, adds no collider and does not grow the triangle count', () => {
    const tri = parts().reduce((n, p) => n + GEOMETRY_TRIANGLES[p.geo], 0)
    const report = sceneDetailReport()
    const obj = report.objects.find((o) => o.name === 'couch')!
    console.info(`[21.1] couch triangles: ${tri} (before 412), total ${report.totalTriangles}, textures ${report.textureCount}, texture memory ${(report.textureMemoryBytes / 1048576).toFixed(2)} MB`)
    expect(obj.triangles).toBe(tri)
    expect(tri).toBeLessThanOrEqual(412)
    expect(report.totalTriangles).toBeLessThan(SCENE_TRIANGLE_BUDGET)
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(TEXTURE_MEMORY_BUDGET_BYTES)
    expect(COLLIDERS.length).toBe(ROOM.walls.length + 4 + ROOM.props.filter((p) => p.solid).length)
    for (const p of parts()) {
      if (p.rot) continue
      expect(p.pos[0] - p.scale[0] / 2).toBeGreaterThanOrEqual(couch.box.minX - 1e-6)
      expect(p.pos[0] + p.scale[0] / 2).toBeLessThanOrEqual(couch.box.maxX + 1e-6)
    }
  })

  it('upholstery boxes use metric UVs: one wale-sized repeat per FABRIC_METRES_PER_REPEAT metres, cached and shared', () => {
    const fabricParts = parts().filter((p) => p.metricFabric)
    expect(fabricParts.length).toBeGreaterThanOrEqual(8)
    expect(fabricParts.every((p) => p.geo === 'box' && ['couchBody', 'couchCushion', 'couchPillow'].includes(p.mat))).toBe(true)
    const g = metricBoxGeometry(1.8, 0.2, 0.8, FABRIC_METRES_PER_REPEAT)
    expect(metricBoxGeometry(1.8, 0.2, 0.8, FABRIC_METRES_PER_REPEAT)).toBe(g)
    const uv = g.getAttribute('uv')
    // Front face (+z, vertices 16..19): u spans width / repeat, v spans height / repeat; ribs stay vertical.
    const us = [16, 17, 18, 19].map((i) => uv.getX(i))
    const vs = [16, 17, 18, 19].map((i) => uv.getY(i))
    expect(Math.max(...us) - Math.min(...us)).toBeCloseTo(1.8 / FABRIC_METRES_PER_REPEAT, 6)
    expect(Math.max(...vs) - Math.min(...vs)).toBeCloseTo(0.2 / FABRIC_METRES_PER_REPEAT, 6)
    // Wood boards keep their separate grain-aligned cache entries and count.
    expect(fabricBoxCount()).toBeGreaterThanOrEqual(1)
    const before = woodBoxCount()
    woodBoxGeometry(0.5, 0.05, 0.2)
    expect(woodBoxCount()).toBe(before + 1)
    const spy = vi.spyOn(g, 'dispose')
    disposeSharedResources()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(fabricBoxCount()).toBe(0)
    expect(() => disposeSharedResources()).not.toThrow()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('couchFabric is attached to every couch material with the textured hue, falls back to the flat colours, and is disposed once', () => {
    const keys = ['couchBody', 'couchCushion', 'couchPillow'] as const
    setCanvasFactory(null)
    ensureSharedTextures()
    for (const k of keys) {
      expect(materials[k].map).toBeNull()
      expect(`#${materials[k].color.getHexString()}`).toBe(COUCH_FABRIC_COLORS[k].flat)
    }
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    const tex = getSharedTexture('couchFabric')!
    expect(tex).not.toBeNull()
    expect([tex.image.width, tex.image.height]).toEqual([256, 256])
    expect(tex.colorSpace).toBe('srgb')
    expect(tex.generateMipmaps).toBe(true)
    expect(tex.minFilter).toBe(1008) // LinearMipmapLinearFilter
    expect(tex.wrapS).toBe(1000) // RepeatWrapping
    for (const k of keys) {
      expect(materials[k].map).toBe(tex)
      expect(`#${materials[k].color.getHexString()}`).toBe(COUCH_FABRIC_COLORS[k].textured)
    }
    expect(liveTextureCount()).toBe(TEXTURE_IDS.length)
    const spy = vi.spyOn(tex, 'dispose')
    disposeSharedResources()
    expect(spy).toHaveBeenCalledTimes(1)
    for (const k of keys) {
      expect(materials[k].map).toBeNull()
      expect(`#${materials[k].color.getHexString()}`).toBe(COUCH_FABRIC_COLORS[k].flat)
    }
    expect(() => disposeSharedResources()).not.toThrow()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('texture memory stays within 8 MB with couchFabric counted', () => {
    expect(TEXTURE_IDS).toContain('couchFabric')
    expect(totalTextureMemoryBytes()).toBeLessThanOrEqual(TEXTURE_MEMORY_BUDGET_BYTES)
  })
})

describe('task 21.2: CRT casing texture and glass screen', () => {
  afterEach(() => setCanvasFactory(null))

  const crt = () => prop('crt-vhs')

  it('the two television shells use the dedicated crtCasing material with one tile per shell width', () => {
    const parts = crtTelevisionParts(crt().box, crt().height)
    const shells = parts.filter((p) => p.mat === 'crtCasing')
    expect(shells).toHaveLength(2)
    for (const s of shells) expect(s.metricRepeat).toBeCloseTo(s.scale[0], 9)
    // The old mint `casing` material was removed in task 22.2 (the CRT stack now uses crtCasing too).
    expect('casing' in materials).toBe(false)
    expect(parts.some((p) => (p.mat as string) === 'casing')).toBe(false)
    // Real-size shells render from cached metric geometry and keep their draw-call grouping per size.
    expect(new Set(shells.map(partGroupKey)).size).toBe(2)
  })

  it('CRT geometry is unchanged in triangle count and the whole scene stays within budget', () => {
    const parts = crtTelevisionParts(crt().box, crt().height)
    const tris = parts.reduce((n, p) => n + GEOMETRY_TRIANGLES[p.geo], 0)
    const report = sceneDetailReport()
    const crtObj = report.objects.find((o) => o.name === 'crt-television')!
    console.info(
      `[21.2] computed triangles ${report.totalTriangles}, crt-television ${tris} triangles / ${crtObj.drawCalls} draw calls, draw-call estimate ${report.totalDrawCalls}, ` +
        `textures ${report.textureCount}, texture memory estimate ${(report.textureMemoryBytes / 1048576).toFixed(2)} MB (computed, not runtime-measured), lights ${M3_LIGHT_COUNT}`,
    )
    // 9 boxes (3 casing, 4 bezel, grille, badge bar), 1 plane, 6 low cylinders (2 knobs, LED, 3 antenna parts), unchanged by 21.2.
    expect(tris).toBe(9 * 12 + 2 + 6 * 32)
    expect(report.totalTriangles).toBeLessThan(SCENE_TRIANGLE_BUDGET)
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(7.7 * 1048576 + TASK_27_1_TEXTURE_BYTES)
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(TEXTURE_MEMORY_BUDGET_BYTES)
    expect(M3_LIGHT_COUNT).toBe(4)
  })

  it('crtScreenPlacement still equals the single television screen part (nudged 5 mm)', () => {
    const screens = crtTelevisionParts(crt().box, crt().height).filter((p) => p.mat === 'crtScreen')
    expect(screens).toHaveLength(1)
    const rect = crtScreenRect(crt().box, crt().height)
    expect([...screens[0].pos]).toEqual([...rect.position])
    expect(crtScreenPlacement()!.position[2]).toBeCloseTo(rect.position[2] + 0.005)
  })

  it('without a canvas the casing and screen keep flat colours and no map', () => {
    setCanvasFactory(null)
    ensureSharedTextures()
    expect(materials.crtCasing.map).toBeNull()
    expect(materials.crtScreen.map).toBeNull()
    expect(`#${materials.crtCasing.color.getHexString()}`).toBe(CRT_CASING_COLORS.flat)
    expect(`#${materials.crtScreen.color.getHexString()}`).toBe(BASE_CRT_SCREEN_COLOR)
    expect(getSharedTexture('crtCasing')).toBeNull()
    expect(getSharedTexture('crtGlass')).toBeNull()
  })

  it('with a canvas both textures attach, the screen multiplier is white, and each texture is disposed exactly once', () => {
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    const casing = getSharedTexture('crtCasing')!
    const glass = getSharedTexture('crtGlass')!
    expect(materials.crtCasing.map).toBe(casing)
    expect(materials.crtScreen.map).toBe(glass)
    expect(`#${materials.crtCasing.color.getHexString()}`).toBe(CRT_CASING_COLORS.textured)
    expect(`#${materials.crtScreen.color.getHexString()}`).toBe('#ffffff')
    expect(casing.colorSpace).toBe('srgb')
    expect(casing.generateMipmaps).toBe(true)
    expect(casing.minFilter).toBe(1008) // LinearMipmapLinearFilter
    expect(glass.generateMipmaps).toBe(false)
    expect(glass.magFilter).toBe(1003) // NearestFilter
    // The shared screen material is the one the Effects overlay and Memory_Shift know.
    expect(materials.crtScreen.type).toBe('MeshBasicMaterial')
    expect(liveTextureCount()).toBe(TEXTURE_IDS.length)
    const spies = [casing, glass].map((t) => vi.spyOn(t, 'dispose'))
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(materials.crtCasing.map).toBeNull()
    expect(materials.crtScreen.map).toBeNull()
    expect(`#${materials.crtCasing.color.getHexString()}`).toBe(CRT_CASING_COLORS.flat)
    expect(`#${materials.crtScreen.color.getHexString()}`).toBe(BASE_CRT_SCREEN_COLOR)
    expect(() => disposeSharedResources()).not.toThrow()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(liveTextureCount()).toBe(0)
  })

  it('the two new textures cost 0.33 MB and at most 0.25 MB', () => {
    expect(textureMemoryBytes(TEXTURE_SPECS.crtCasing)).toBeLessThanOrEqual(0.34 * 1048576)
    expect(textureMemoryBytes(TEXTURE_SPECS.crtGlass)).toBeLessThanOrEqual(0.25 * 1048576)
    expect(totalTextureMemoryBytes()).toBeLessThanOrEqual(7.7 * 1048576 + TASK_27_1_TEXTURE_BYTES)
  })
})

describe('task 22.1: media island, armchair and VHS shells', () => {
  afterEach(() => setCanvasFactory(null))

  const crt = () => prop('crt-vhs')
  const chair = () => prop('abandoned-chair')
  const tapeMats = ['tapeBlack', 'tapeBlue'] as const
  /** Every part list that holds loose VHS tapes. */
  const tapeParts = () => [
    ...vcrDeckParts(crt().box),
    ...consoleTapeParts(crt().box),
    ...deskParts(prop('reception-desk').box, prop('reception-desk').height),
    ...ARCHIVE_BOX_IDS.flatMap((id) => archiveBoxParts(prop(id).box, prop(id).height)),
  ].filter((p) => (tapeMats as readonly string[]).includes(p.mat))

  it('the reference monitor housing uses crtCasing with one tile per monitor width, not the old casing', () => {
    const parts = referenceMonitorParts(crt().box)
    const housing = parts.filter((p) => p.mat === 'crtCasing')
    expect(housing).toHaveLength(1)
    expect(housing[0].metricRepeat).toBeCloseTo(housing[0].scale[0], 9)
    expect(parts.some((p) => (p.mat as string) === 'casing')).toBe(false)
    expect(parts.some((p) => p.mat === 'smpteScreen')).toBe(true)
  })

  it('the VCR housing uses the vcrDeck material with a 0.62 m x 0.31 m tile, and keeps its timecode, slot and buttons', () => {
    const parts = vcrDeckParts(crt().box)
    const housing = parts.filter((p) => p.mat === 'vcrDeck')
    expect(housing).toHaveLength(1)
    expect(housing[0].metricRepeat).toBeCloseTo(housing[0].scale[0], 9)
    expect(housing[0].metricAspect).toBe(0.5)
    expect(parts.some((p) => p.mat === 'plastic')).toBe(false)
    expect(parts.some((p) => p.mat === 'timecode')).toBe(true)
    expect(parts.filter((p) => p.mat === 'tapeSlotMetal')).toHaveLength(3)
    expect(parts.filter((p) => p.mat === 'metal')).toHaveLength(4)
    // The aspect changes the cached geometry: v spans half a tile over the same height.
    const sq = metricBoxGeometry(0.62, 0.1, 0.38, 0.62)
    const wide = metricBoxGeometry(0.62, 0.1, 0.38, 0.62, false, 0.5)
    expect(wide).not.toBe(sq)
    expect(metricBoxGeometry(0.62, 0.1, 0.38, 0.62, false, 0.5)).toBe(wide)
    const maxV = (g: typeof sq) => Math.max(...Array.from({ length: g.getAttribute('uv').count }, (_, i) => g.getAttribute('uv').getY(i)))
    expect(maxV(wide) / maxV(sq)).toBeCloseTo(2, 6)
  })

  it('armchair fabric parts use the armchair materials; boxes carry metric fabric UVs and the legs keep wood', () => {
    const parts = armchairParts(chair().box)
    const fabric = parts.filter((p) => p.mat === 'armchairBody' || p.mat === 'armchairCushion')
    expect(fabric.length).toBe(9)
    expect(fabric.filter((p) => p.geo === 'box').every((p) => p.metricFabric === true)).toBe(true)
    expect(fabric.filter((p) => p.geo === 'box')).toHaveLength(6)
    expect(parts.filter((p) => p.geo === 'cylinderLow' && p.mat === 'woodDark')).toHaveLength(4)
    expect(parts.some((p) => p.mat === ('fabric' as never) || p.mat === ('fabricLight' as never))).toBe(false)
  })

  it('armchair triangles are unchanged and the scene stays under 20,000 with the same triangle count as before 22.1', () => {
    const report = sceneDetailReport()
    const obj = report.objects.find((o) => o.name === 'armchair')!
    const tri = armchairParts(chair().box).reduce((n, p) => n + GEOMETRY_TRIANGLES[p.geo], 0)
    expect(obj.triangles).toBe(tri)
    // 19,128 before task 22.2; part A changes it by -72 net (crate label panels +24, cabinet ink lines -96), part B by +116 (notebook page block +12, mug rim +32, door detail +72).
    // Task 23.1 replaced the two old desk lamps (470 triangles) with two new ones (352): -118.
    // Task 23.2 replaced 7 ordinary books on shelf-b (-84) with 3 manuals and 3 spine bands (+72): -12.
    // Task 24.1: two lamp cones (+48) and five ceiling bloom strips (+10) = +58.
    expect(report.totalTriangles).toBe(19128 - 72 + 116 - 118 - 12 + 58 + 18 + 6 + TASK_26_1_TRIANGLES + TASK_27_1_TRIANGLES + TASK_28_2_TRIANGLES + TASK_30_1_TRIANGLES + TASK_33_1_TRIANGLES + TASK_34_1_TRIANGLES + TASK_35_1_TRIANGLES) // 27.1: -36 (three cream manual band boxes) // 25.1: +16 brass caps, +2 liner; 25.2: +6 floor glow decals; 26.1: +64 coffee discs
    expect(report.totalTriangles).toBeLessThan(SCENE_TRIANGLE_BUDGET)
  })

  it('every loose tape part uses a vhsShell-mapped material with one tile per cassette length', () => {
    const parts = tapeParts()
    expect(parts.length).toBeGreaterThanOrEqual(15)
    for (const p of parts) {
      expect(p.geo).toBe('box')
      expect(p.metricRepeat, p.mat).toBeCloseTo(p.scale[0], 9)
    }
    // Navy tapes exist in the console stacks and the archive-box stacks; the bookcase spine material is not used for tapes.
    expect(parts.some((p) => p.mat === 'tapeBlue')).toBe(true)
    expect(consoleTapeParts(crt().box).some((p) => p.mat === ('spineB' as never))).toBe(false)
  })

  it('without a canvas the new materials keep their flat colours', () => {
    setCanvasFactory(null)
    ensureSharedTextures()
    const hex = (k: keyof typeof materials) => `#${(materials[k] as unknown as { color: { getHexString(): string } }).color.getHexString()}`
    expect(hex('armchairBody')).toBe('#3d5a4c')
    expect(hex('armchairCushion')).toBe('#4f7561')
    expect(hex('vcrDeck')).toBe(VCR_CHASSIS_COLOR)
    expect(hex('tapeBlack')).toBe('#2a2d36') // 31.2: satin charcoal (was #15151a)
    expect(hex('tapeBlue')).toBe('#2a4aa0')
    for (const k of ['armchairBody', 'armchairCushion', 'vcrDeck', 'tapeBlack', 'tapeBlue'] as const) expect(materials[k].map).toBeNull()
  })

  it('with a canvas the new textures are attached with their multipliers and every texture is disposed exactly once', () => {
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    const deck = getSharedTexture('vcrDeck')!
    const shell = getSharedTexture('vhsShell')!
    const fabric = getSharedTexture('couchFabric')!
    expect([deck.image.width, deck.image.height]).toEqual([256, 128])
    expect([shell.image.width, shell.image.height]).toEqual([128, 128])
    expect([getSharedTexture('corkBoard')!.image.width, getSharedTexture('corkBoard')!.image.height]).toEqual([256, 256])
    for (const t of [deck, shell]) {
      expect(t.colorSpace).toBe('srgb')
      expect(t.generateMipmaps).toBe(true)
      expect(t.minFilter).toBe(1008) // LinearMipmapLinearFilter
      expect(t.magFilter).toBe(1006) // LinearFilter
    }
    expect(materials.vcrDeck.map).toBe(deck)
    expect(materials.tapeBlack.map).toBe(shell)
    expect(materials.tapeBlue.map).toBe(shell)
    expect(materials.armchairBody.map).toBe(fabric)
    expect(materials.armchairCushion.map).toBe(fabric)
    expect(materials.crtCasing.map).toBe(getSharedTexture('crtCasing'))
    expect(`#${materials.armchairBody.color.getHexString()}`).toBe(COUCH_FABRIC_COLORS.armchairBody.textured)
    expect(`#${materials.armchairCushion.color.getHexString()}`).toBe(COUCH_FABRIC_COLORS.armchairCushion.textured)
    // Tape multipliers keep their hue: black stays neutral-dark, navy stays blue.
    const rgb = (c: { r: number; g: number; b: number }) => [c.r, c.g, c.b]
    const black = rgb(materials.tapeBlack.color)
    expect(Math.max(...black)).toBeLessThan(0.1)
    const blue = rgb(materials.tapeBlue.color)
    expect(blue[2]).toBeGreaterThan(blue[1])
    expect(blue[1]).toBeGreaterThan(blue[0])

    expect(liveTextureCount()).toBe(TEXTURE_IDS.length)
    const spies = TEXTURE_IDS.map((id) => vi.spyOn(getSharedTexture(id)!, 'dispose'))
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(liveTextureCount()).toBe(0)
    expect(`#${materials.armchairBody.color.getHexString()}`).toBe(COUCH_FABRIC_COLORS.armchairBody.flat)
    expect(`#${materials.tapeBlue.color.getHexString()}`).toBe('#2a4aa0')
    expect(materials.vcrDeck.map).toBeNull()
    expect(() => disposeSharedResources()).not.toThrow()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
  })

  it('counts: 32 textures and at most 7.7 MB (budget 8 MB), colliders unchanged', () => {
    const report = sceneDetailReport()
    const perTexture = TEXTURE_IDS.map((id) => `${id} ${TEXTURE_SPECS[id].width}x${TEXTURE_SPECS[id].height}=${(textureMemoryBytes(TEXTURE_SPECS[id]) / 1048576).toFixed(3)}MB`)
    console.info(
      `[22.1] computed triangles ${report.totalTriangles}, draw-call estimate ${report.totalDrawCalls}, textures ${report.textureCount}, ` +
        `texture memory estimate ${(report.textureMemoryBytes / 1048576).toFixed(3)} MB (computed, not runtime-measured): ${perTexture.join(', ')}`,
    )
    expect(report.textureCount).toBe(32)
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(7.7 * 1048576 + TASK_27_1_TEXTURE_BYTES)
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(TEXTURE_MEMORY_BUDGET_BYTES)
    expect(report.totalTriangles).toBeLessThan(SCENE_TRIANGLE_BUDGET)
    expect(M3_LIGHT_COUNT).toBeLessThanOrEqual(MAX_LIGHTS)
    expect(COLLIDERS.length).toBe(ROOM.walls.length + 4 + ROOM.props.filter((p) => p.solid).length)
  })
})

describe('task 22.2 (part A): metalCabinet, cardboard crate and CRT stack casing', () => {
  afterEach(() => setCanvasFactory(null))

  const cabinets = () => [0, 1].map((v) => filingCabinetParts(prop(`filing-cabinet-${v ? 'b' : 'a'}`).box, prop(`filing-cabinet-${v ? 'b' : 'a'}`).height, v))
  const mapped = ['filingGrey', 'filingDark', 'filingGreyB', 'filingDarkB', 'filingCard'] as const
  const hex = (k: keyof typeof materials) => `#${(materials[k] as unknown as { color: { getHexString(): string } }).color.getHexString()}`

  it('cabinet body and drawer fronts use metalCabinet-mapped materials with metric UVs; handles and slots stay geometry', () => {
    for (const parts of cabinets()) {
      const on = parts.filter((p) => (mapped as readonly string[]).includes(p.mat))
      expect(on.length).toBeGreaterThan(FILING_DRAWERS * 5)
      for (const p of on) {
        expect(p.metricRepeat).toBeGreaterThan(0)
        expect(p.metricAspect).toBeGreaterThan(0)
        expect(p.metricOffset).toBeDefined()
      }
      expect(parts.filter((p) => p.mat === 'filingCard')).toHaveLength(FILING_DRAWERS)
      expect(parts.filter((p) => p.mat === 'labelSlot')).toHaveLength(FILING_DRAWERS)
      expect(parts.filter((p) => p.mat === 'metal').length).toBeGreaterThanOrEqual(FILING_DRAWERS * 3)
    }
  })

  it('the four drawer bands of the tile line up with the four drawer fronts (documented mapping)', () => {
    const parts = filingCabinetParts(prop('filing-cabinet-a').box, prop('filing-cabinet-a').height, 0)
    const body = parts.find((p) => p.mat === 'filingGrey' && p.scale[1] > 0.5)!
    const bodyH = body.scale[1]
    const faces = parts.filter((p) => p.mat === 'filingDark')
    expect(faces).toHaveLength(FILING_DRAWERS)
    // v range (in tile fractions) covered by each face is inside its own quarter of the tile.
    const bands = faces.map((p) => {
      const v0 = (p.metricOffset![1] / (p.metricRepeat! * p.metricAspect!)) * (1 / 1)
      const v1 = v0 + p.scale[1] / (p.metricRepeat! * p.metricAspect!)
      return [v0, v1]
    })
    expect(bodyH / (body.metricRepeat! * body.metricAspect!)).toBeCloseTo(1, 6)
    bands.sort((a, b) => a[0] - b[0]).forEach(([v0, v1], i) => {
      expect(v0).toBeGreaterThanOrEqual(i / FILING_DRAWERS - 1e-6)
      expect(v1).toBeLessThanOrEqual((i + 1) / FILING_DRAWERS + 1e-6)
    })
  })

  it('without a canvas the cabinet materials have the exact old flat colours and no map', () => {
    setCanvasFactory(null)
    ensureSharedTextures()
    const flat = { filingGrey: '#6f7782', filingDark: '#59606b', filingGreyB: '#7a7d70', filingDarkB: '#656858', filingCard: '#d8d2b8' } as const
    for (const k of mapped) {
      expect(hex(k)).toBe(flat[k])
      expect(materials[k].map).toBeNull()
    }
    expect(getSharedTexture('metalCabinet')).toBeNull()
    expect(materials.crate.map).toBeNull()
    expect(hex('crate')).toBe('#8a6a3c')
  })

  it('archive boxes, desk archive box and crate label panels use the cardboard crate texture; crate bodies stay wood', () => {
    for (const id of ARCHIVE_BOX_IDS) {
      const boxes = archiveBoxParts(prop(id).box, prop(id).height).filter((p) => p.mat === 'cardboard')
      expect(boxes.length).toBeGreaterThan(0)
      for (const p of boxes) expect(p.metricRepeat).toBeCloseTo(p.scale[0], 9)
    }
    for (const id of ['crate-a', 'crate-b']) {
      const parts = crateParts(prop(id).box, prop(id).height)
      const panel = parts.filter((p) => p.mat === 'crate')
      expect(panel).toHaveLength(1)
      expect(panel[0].metricRepeat).toBeCloseTo(panel[0].scale[2], 9)
      expect(parts.filter((p) => p.mat === 'crateWood').length).toBeGreaterThanOrEqual(2)
    }
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    const tex = getSharedTexture('crate')!
    expect([tex.image.width, tex.image.height]).toEqual([256, 256])
    expect(materials.crate.map).toBe(tex)
    expect(materials.cardboard.map).toBe(tex)
    expect(materials.crateWood.map).toBe(getSharedTexture('wood'))
  })

  it('the CRT stack housings use crtCasing (one tile per monitor width) and the mint casing material is gone', () => {
    const stack = prop('crt-stack')
    const parts = crtStackParts(stack.box, stack.height)
    const housings = parts.filter((p) => p.mat === 'crtCasing')
    expect(housings.length).toBeGreaterThanOrEqual(2)
    for (const p of housings) expect(p.metricRepeat).toBeCloseTo(p.scale[0], 9)
    for (const o of declaredObjects()) for (const p of o.parts) expect(p.mat as string).not.toBe('casing')
    expect('casing' in materials).toBe(false)
  })

  it('metalCabinet and crate are textured, disposed exactly once, twice-safe; budget numbers hold', () => {
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    const cab = getSharedTexture('metalCabinet')!
    expect([cab.image.width, cab.image.height]).toEqual([256, 256])
    expect(cab.colorSpace).toBe('srgb')
    expect(cab.generateMipmaps).toBe(true)
    for (const k of mapped) expect(materials[k].map).toBe(cab)
    expect(liveTextureCount()).toBe(TEXTURE_IDS.length)
    const spies = TEXTURE_IDS.map((id) => vi.spyOn(getSharedTexture(id)!, 'dispose'))
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(() => disposeSharedResources()).not.toThrow()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(liveTextureCount()).toBe(0)
    expect(hex('filingGrey')).toBe('#6f7782')

    const report = sceneDetailReport()
    const mb = (id: (typeof TEXTURE_IDS)[number]) => (textureMemoryBytes(TEXTURE_SPECS[id]) / 1048576).toFixed(3)
    console.info(
      `[22.2A] triangles ${report.totalTriangles}, draw calls ${report.totalDrawCalls}, textures ${report.textureCount}, texture memory ${(report.textureMemoryBytes / 1048576).toFixed(3)} MB ` +
        `(computed, not runtime-measured), metalCabinet ${mb('metalCabinet')} MB, crate ${mb('crate')} MB`,
    )
    expect(report.totalTriangles).toBeLessThan(SCENE_TRIANGLE_BUDGET)
    expect(report.totalTriangles - 19128).toBeLessThanOrEqual(60 + TASK_34_1_TRIANGLES + TASK_35_1_TRIANGLES)
    expect(report.textureCount).toBe(32)
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(7.55 * 1048576 + TASK_27_1_TEXTURE_BYTES)
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(TEXTURE_MEMORY_BUDGET_BYTES)
    expect(M3_LIGHT_COUNT).toBe(4)
  })
})

describe('task 22.2 (part B): desk clutter and east doorway detail', () => {
  afterEach(() => setCanvasFactory(null))

  const desk = prop('reception-desk')
  const deskP = () => deskParts(desk.box, desk.height)
  const top = desk.height
  const EPS = 1e-6

  /** Conservative world AABB of a part (rotated about Y or by the cylinder tilt: uses the bounding sphere of the rotated half extents). */
  const aabb = (p: Part) => {
    const e = new Euler(p.rot?.[0] ?? 0, p.rot?.[1] ?? 0, p.rot?.[2] ?? 0)
    const m = new Matrix4().makeRotationFromEuler(e)
    const half = p.geo === 'box' || p.geo === 'plane' ? [p.scale[0] / 2, p.scale[1] / 2, p.scale[2] / 2] : [p.scale[0] / 2, p.scale[1] / 2, p.scale[2] / 2]
    const lo = new Vector3(Infinity, Infinity, Infinity)
    const hi = new Vector3(-Infinity, -Infinity, -Infinity)
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const v = new Vector3(half[0] * sx, half[1] * sy, half[2] * sz).applyMatrix4(m)
      lo.min(v)
      hi.max(v)
    }
    return { minX: lo.x + p.pos[0], maxX: hi.x + p.pos[0], minY: lo.y + p.pos[1], maxY: hi.y + p.pos[1], minZ: lo.z + p.pos[2], maxZ: hi.z + p.pos[2] }
  }
  const overlap3 = (a: ReturnType<typeof aabb>, b: ReturnType<typeof aabb>) =>
    Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > EPS &&
    Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) > EPS &&
    Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ) > EPS

  it('notebook has a grain cover and a ruled page block stacked on the desk top, the mug has a rim ring', () => {
    const parts = deskP()
    const cover = parts.filter((p) => p.mat === 'notebookCover')
    const page = parts.filter((p) => p.mat === 'paper')
    const rim = parts.filter((p) => p.mat === 'mugRim')
    expect(cover).toHaveLength(1)
    expect(page).toHaveLength(1)
    expect(rim).toHaveLength(1)
    expect(rim[0].geo).toBe('cylinderLow')
    expect(cover[0].metricRepeat).toBe(page[0].metricRepeat)
    expect(page[0].metricOffset![0]).toBeCloseTo(page[0].metricRepeat! / 2, 9)
    expect(cover[0].metricOffset).toBeUndefined()
    const c = aabb(cover[0])
    const g = aabb(page[0])
    expect(c.minY).toBeCloseTo(top, 9)
    expect(g.minY).toBeCloseTo(c.maxY, 9)
    // The rim is the top of the mug: same footprint centre, resting on the body.
    const body = parts.find((p) => p.mat === 'mug' && p.geo === 'cylinderLow')!
    expect(rim[0].pos[0]).toBe(body.pos[0])
    expect(body.pos[1] - body.scale[1] / 2).toBeCloseTo(top, 9)
    expect(rim[0].pos[1] - rim[0].scale[1] / 2).toBeCloseTo(body.pos[1] + body.scale[1] / 2, 9)
    expect(rim[0].scale[0]).toBeGreaterThan(body.scale[0])
  })

  it('every desk clutter part rests on the desk top, stays inside its footprint and intersects no other desk part', () => {
    const parts = deskP()
    const clutter = parts.filter((p) => p.pos[1] - p.scale[1] / 2 >= top - EPS || ['notebookCover', 'paper', 'mugRim'].includes(p.mat))
    const boxes = clutter.map(aabb)
    const slab = { minX: desk.box.minX - 0.05, maxX: desk.box.maxX + 0.05, minZ: desk.box.minZ - 0.05, maxZ: desk.box.maxZ + 0.05 }
    boxes.forEach((b, i) => {
      expect(b.minY, `part ${clutter[i].mat}`).toBeGreaterThanOrEqual(top - EPS)
      expect(b.minX >= slab.minX && b.maxX <= slab.maxX && b.minZ >= slab.minZ && b.maxZ <= slab.maxZ, `${clutter[i].mat} inside top`).toBe(true)
    })
    // Pairs that nest on purpose are excluded: the lamp and bell stacks are single objects declared before this part.
    const mine = clutter.map((p, i) => ({ p, b: boxes[i] })).filter(({ p }) => ['notebookCover', 'paper', 'mugRim', 'mug'].includes(p.mat) || (p.mat === 'spineC' && p.geo === 'cylinderLow') || (p.mat === 'metal' && p.geo === 'box' && p.scale[0] === 0.15))
    for (let i = 0; i < clutter.length; i++) {
      for (const m of mine) {
        if (m.p === clutter[i]) continue
        // The mug handle and body touch by design; the lamp, bell and archive box are far away.
        if (m.p.mat === 'mug' && clutter[i].mat === 'mug') continue
        expect(overlap3(m.b, boxes[i]), `${m.p.mat} vs ${clutter[i].mat}`).toBe(false)
      }
    }
  })

  const doors = () => doorDetailParts()
  it('door detail parts stay out of every opening, protrude at most 2 cm from the face they sit on and add no collider', () => {
    const parts = doors()
    expect(parts.length).toBeGreaterThanOrEqual(6)
    const colliders = [...ROOM.walls, ...ROOM.doors.flatMap((d) => d.frames)]
    for (const p of parts) {
      expect(['metal', 'woodDark']).toContain(p.mat)
      const b = aabb(p)
      for (const d of ROOM.doors) {
        const o = d.opening
        const inside = Math.min(b.maxX, o.maxX) - Math.max(b.minX, o.minX) > EPS && Math.min(b.maxZ, o.maxZ) - Math.max(b.minZ, o.minZ) > EPS
        expect(inside, `${p.mat} inside ${d.id}`).toBe(false)
      }
      // It touches a frame or wall box and sticks out of it by at most 2 cm in x; z and y stay within the face.
      const host = colliders.find((c) => b.minX < c.maxX + 0.02 + EPS && b.maxX > c.minX - 0.02 - EPS && b.minZ >= c.minZ - EPS && b.maxZ <= c.maxZ + EPS)
      expect(host, `${p.mat} host`).toBeDefined()
      const out = Math.max(host!.minX - b.minX, b.maxX - host!.maxX, 0)
      expect(out).toBeLessThanOrEqual(0.02 + EPS)
      expect(out).toBeGreaterThan(0)
      expect(b.minY).toBeGreaterThan(0.1)
      expect(b.maxY).toBeLessThan(2.1)
    }
    expect(COLLIDERS.length).toBe(ROOM.walls.length + 4 + ROOM.props.filter((p) => p.solid).length)
    expect(declaredObjects().some((o) => o.name === 'door-detail')).toBe(true)
  })

  it('deskDetail is bound to paper and the cover, disposed once, twice-safe, with a null fallback and the old flat colours', () => {
    const col = (k: keyof typeof materials) => `#${(materials[k] as unknown as { color: { getHexString(): string } }).color.getHexString()}`
    setCanvasFactory(() => null)
    ensureSharedTextures()
    expect(getSharedTexture('deskDetail')).toBeNull()
    expect(materials.paper.map).toBeNull()
    expect(materials.notebookCover.map).toBeNull()
    expect(col('paper')).toBe('#e6dfc6')
    disposeSharedResources()
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    const tex = getSharedTexture('deskDetail')!
    expect([tex.image.width, tex.image.height]).toEqual([128, 64])
    expect(materials.paper.map).toBe(tex)
    expect(materials.notebookCover.map).toBe(tex)
    const spies = TEXTURE_IDS.map((id) => vi.spyOn(getSharedTexture(id)!, 'dispose'))
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(() => disposeSharedResources()).not.toThrow()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(col('paper')).toBe('#e6dfc6')
    expect(col('notebookCover')).toBe('#4a5866')
  })

  it('counts: 32 textures, at most 7.5 MB (budget 8 MB), under 20,000 triangles with at most +120 over 19,056, 4 lights', () => {
    const report = sceneDetailReport()
    console.info(
      `[22.2B] triangles ${report.totalTriangles} (delta ${report.totalTriangles - 19056}), draw calls ${report.totalDrawCalls}, textures ${report.textureCount}, ` +
        `texture memory ${(report.textureMemoryBytes / 1048576).toFixed(3)} MB (computed, not runtime-measured), deskDetail ${(textureMemoryBytes(TEXTURE_SPECS.deskDetail) / 1048576).toFixed(3)} MB`,
    )
    expect(report.totalTriangles).toBeLessThan(SCENE_TRIANGLE_BUDGET)
    expect(report.totalTriangles - 19056).toBeLessThanOrEqual(120 + TASK_26_1_TRIANGLES + TASK_35_1_TRIANGLES)
    expect(report.textureCount).toBe(32)
    // Task 23.1: lampGlow 64 -> 128 px adds 0.062 MiB (7.459 -> 7.521 MiB), so the cap is 7.55 MiB.
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(7.55 * 1048576 + TASK_27_1_TEXTURE_BYTES)
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(TEXTURE_MEMORY_BUDGET_BYTES)
    expect(M3_LIGHT_COUNT).toBe(4)
  })
})

describe('task 25.1: lamp craft, soft cones, richer pools, notebook move', () => {
  afterEach(() => setCanvasFactory(null))
  const desk = prop('reception-desk')
  const top = desk.height
  const lamp = (id: string, on = true) => deskLampParts(prop(id).box, id === 'desk-lamp-left' ? 'banker' : 'table', on, top)
  const ext = (p: Part) => {
    const size: Vec3 = p.geo === 'plane' || p.geo === 'disc' ? [p.scale[0], p.scale[1], 0] : p.scale
    const h = orientedHalfExtents(size, p.rot ?? [0, 0, 0])
    return { minX: p.pos[0] - h[0], maxX: p.pos[0] + h[0], minY: p.pos[1] - h[1], maxY: p.pos[1] + h[1], minZ: p.pos[2] - h[2], maxZ: p.pos[2] + h[2] }
  }
  const hit = (a: ReturnType<typeof ext>, b: ReturnType<typeof ext>) =>
    Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > 1e-6 &&
    Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) > 1e-6 &&
    Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ) > 1e-6

  it('both lamp cones use the coneFalloff map (additive, depthWrite false, DoubleSide), and it is disposed once, twice-safe, with a null fallback', () => {
    setCanvasFactory(() => null)
    ensureSharedTextures()
    expect(getSharedTexture('coneFalloff')).toBeNull()
    expect(materials.lampConeBanker.map).toBeNull()
    expect(materials.lampConeTable.map).toBeNull()
    disposeSharedResources()
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    const tex = getSharedTexture('coneFalloff')!
    expect([tex.image.width, tex.image.height]).toEqual([64, 64])
    expect(tex.generateMipmaps).toBe(false)
    expect(tex.minFilter).toBe(1006) // LinearFilter
    expect(tex.magFilter).toBe(1006)
    expect(tex.colorSpace).toBe('srgb')
    for (const m of [materials.lampConeBanker, materials.lampConeTable]) {
      expect(m.map).toBe(tex)
      expect(m.blending).toBe(2)
      expect(m.depthWrite).toBe(false)
      expect(m.side).toBe(2)
      expect(m.transparent).toBe(true)
      expect(m.opacity).toBeGreaterThanOrEqual(0.14)
      expect(m.opacity).toBeLessThanOrEqual(0.25)
    }
    const spies = TEXTURE_IDS.map((id) => vi.spyOn(getSharedTexture(id)!, 'dispose'))
    disposeSharedResources()
    expect(() => disposeSharedResources()).not.toThrow()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(materials.lampConeBanker.map).toBeNull()
    expect(materials.lampConeBanker.color.getHexString()).toBe('8fd65a')
    expect(materials.lampConeTable.color.getHexString()).toBe('ffa63c')
  })

  it('cone UVs: v = 1 at the top ring (the shade rim) and v = 0 at the bottom, so canvas row 0 sits at the rim', () => {
    const g = geometries.cone
    const pos = g.getAttribute('position')
    const uv = g.getAttribute('uv')
    for (let i = 0; i < pos.count; i++) expect(uv.getY(i), 'cone vertex').toBeCloseTo(pos.getY(i) > 0 ? 1 : 0, 9)
    // The top ring is the narrow one (rim radius 0.3 of the scale) and the lamp cone part is scaled so it meets the shade rim.
    const radius = (i: number) => Math.hypot(pos.getX(i), pos.getZ(i))
    for (let i = 0; i < pos.count; i++) expect(radius(i)).toBeCloseTo(pos.getY(i) > 0 ? 0.3 : 0.5, 6)
    const tex = (() => {
      setCanvasFactory(() => fakeCanvas())
      return getSharedTexture('coneFalloff')!
    })()
    expect(tex.flipY).toBe(true) // canvas row 0 is the v = 1 edge
  })

  it('the banker lamp has two brass end caps (+16 triangles) at the hood ends, inside its footprint', () => {
    const left = lamp('desk-lamp-left')
    const caps = left.filter((p) => p.geo === 'collar')
    expect(caps).toHaveLength(2)
    expect(caps.every((p) => p.mat === 'brass')).toBe(true)
    expect(caps.reduce((n, p) => n + GEOMETRY_TRIANGLES[p.geo], 0)).toBe(16)
    const hood = left.filter((p) => p.lampRole === 'shade').map(ext)
    const hoodMinX = Math.min(...hood.map((e) => e.minX))
    const hoodMaxX = Math.max(...hood.map((e) => e.maxX))
    const xs = caps.map((p) => p.pos[0]).sort((a, b) => a - b)
    expect(xs[0]).toBeLessThan(hoodMinX + 0.03)
    expect(xs[1]).toBeGreaterThan(hoodMaxX - 0.03)
    for (const p of caps) {
      const e = ext(p)
      const b = prop('desk-lamp-left').box
      expect(e.minX >= b.minX - 1e-6 && e.maxX <= b.maxX + 1e-6 && e.minZ >= b.minZ - 1e-6 && e.maxZ <= b.maxZ + 1e-6).toBe(true)
      expect(e.minY).toBeGreaterThanOrEqual(top)
    }
    expect(lamp('desk-lamp-right').some((p) => p.geo === 'collar')).toBe(false)
    // The cap triangle count of the whole banker lamp grows by exactly 18 over 24.1 (caps 16 + liner 2).
    expect(left.reduce((n, p) => n + GEOMETRY_TRIANGLES[p.geo], 0) - lamp('desk-lamp-right').reduce((n, p) => n + GEOMETRY_TRIANGLES[p.geo], 0)).toBeDefined()
  })

  it('the banker hood has a warm-white inner liner: lit #fff1cc basic material when ON, a dark separate material when OFF', () => {
    const on = lamp('desk-lamp-left', true).filter((p) => p.lampRole === 'liner')
    const off = lamp('desk-lamp-left', false).filter((p) => p.lampRole === 'liner')
    expect(on).toHaveLength(1)
    expect(off).toHaveLength(1)
    expect(on[0].mat).toBe('lampLinerOn')
    expect(off[0].mat).toBe('lampLinerOff')
    expect(materials.lampLinerOn.type).toBe('MeshBasicMaterial')
    expect(materials.lampLinerOn.color.getHexString()).toBe('fff1cc')
    expect(materials.lampLinerOff.type).toBe('MeshLambertMaterial')
    const lum = (c: { r: number; g: number; b: number }) => c.r + c.g + c.b
    expect(lum(materials.lampLinerOff.color)).toBeLessThan(lum(materials.lampLinerOn.color) / 4)
    // It sits under the hood roof (below the roof, above the bulb centre) and faces down.
    const roof = lamp('desk-lamp-left').find((p) => p.lampRole === 'shade')!
    expect(on[0].pos[1]).toBeLessThan(roof.pos[1])
    expect(on[0].rot).toEqual([Math.PI / 2, 0, 0])
    expect(lamp('desk-lamp-right').some((p) => p.lampRole === 'liner')).toBe(false)
  })

  it('green ON shade is #16a34a at 0.38, OFF is 0, the cream ON shade is unchanged', () => {
    expect(materials.lampGreenShadeOn.emissive.getHexString()).toBe('16a34a')
    expect(materials.lampGreenShadeOn.emissiveIntensity).toBe(0.38)
    expect(materials.lampGreenShade.emissiveIntensity).toBe(0)
    expect(materials.lampCreamShadeOn.emissive.getHexString()).toBe('ffd27d')
    expect(materials.lampCreamShadeOn.emissiveIntensity).toBe(0.85)
    expect(materials.lampCreamShade.emissiveIntensity).toBe(0)
  })

  it('both desk pools have opacity 0.42, stay additive without depth writes, 2 mm above and inside the desk top', () => {
    for (const m of [materials.lampPool, materials.lampPoolBanker]) {
      expect(m.opacity).toBeCloseTo(0.42, 9)
      expect(m.blending).toBe(2)
      expect(m.depthWrite).toBe(false)
      expect([m.polygonOffset, m.polygonOffsetFactor, m.polygonOffsetUnits]).toEqual([true, -2, -2])
    }
    for (const id of ['desk-lamp-left', 'desk-lamp-right']) {
      const pool = lamp(id).find((p) => p.lampRole === 'pool')!
      const half = pool.scale[0] / 2
      expect(pool.pos[1] - top).toBeCloseTo(0.002, 9)
      expect(pool.pos[0] - half).toBeGreaterThanOrEqual(desk.box.minX - 1e-9)
      expect(pool.pos[0] + half).toBeLessThanOrEqual(desk.box.maxX + 1e-9)
      expect(pool.pos[2] - half).toBeGreaterThanOrEqual(desk.box.minZ - 1e-9)
      expect(pool.pos[2] + half).toBeLessThanOrEqual(desk.box.maxZ + 1e-9)
    }
  })

  it('the notepad is centred on the new desk-notebook anchor, inside the desk top, outside the lamp bases and overlapping no desk part', () => {
    const anchor = INTERACTABLE_DEFS.find((d) => d.id === 'desk-notebook')!.anchor
    const cx = (desk.box.minX + desk.box.maxX) / 2
    const cz = (desk.box.minZ + desk.box.maxZ) / 2
    expect([cx + NOTE_DX, cz + NOTE_DZ]).toEqual([anchor.x, anchor.z])
    expect(anchor.x).toBeCloseTo(-0.58, 9)
    expect(anchor.z).toBeCloseTo(1.62, 9)
    const parts = deskParts(desk.box, desk.height)
    const noteParts = parts.filter((p) => p.mat === 'notebookCover' || p.mat === 'paper')
    expect(noteParts).toHaveLength(2)
    for (const p of noteParts) {
      expect(p.pos[0]).toBeCloseTo(anchor.x, 9)
      expect(p.pos[2]).toBeCloseTo(anchor.z, 9)
    }
    const spiral = parts.find((p) => p.mat === 'metal' && p.geo === 'box' && p.scale[0] === 0.15)!
    const noteBoxes = [...noteParts, spiral].map(ext)
    for (const e of noteBoxes) {
      expect(e.minX >= desk.box.minX && e.maxX <= desk.box.maxX && e.minZ >= desk.box.minZ && e.maxZ <= desk.box.maxZ).toBe(true)
      expect(e.minY).toBeGreaterThanOrEqual(top - 1e-9)
    }
    // Not overlapping any other desk part that stands on the desk top (the desk body and slab are below or around it).
    const others = parts.filter((p) => !noteParts.includes(p) && p !== spiral && p.pos[1] - p.scale[1] / 2 >= top - 1e-6)
    for (const o of others) for (const e of noteBoxes) expect(hit(e, ext(o)), o.mat + "/" + o.geo).toBe(false)
    // The pad also stays clear of both lamps' body parts.
    for (const id of ['desk-lamp-left', 'desk-lamp-right']) {
      for (const p of lamp(id).filter((q) => q.lampRole !== 'sprite' && q.lampRole !== 'cone' && q.lampRole !== 'pool')) {
        for (const e of noteBoxes) expect(hit(e, ext(p)), id + " " + p.mat).toBe(false)
      }
    }
  })

  it('budgets: under 20,000 triangles, at most +20 over 19,100, 4 lights, 32 textures within 7.6 MB, every texture disposed once', () => {
    const report = sceneDetailReport()
    expect(report.totalTriangles).toBeLessThan(SCENE_TRIANGLE_BUDGET)
    expect(report.totalTriangles - 19100).toBeLessThanOrEqual(24 + TASK_26_1_TRIANGLES + TASK_34_1_TRIANGLES + TASK_35_1_TRIANGLES) // 25.2 adds 6 more
    expect(report.totalTriangles - 19100).toBe(24 + TASK_26_1_TRIANGLES + TASK_27_1_TRIANGLES + TASK_28_2_TRIANGLES + TASK_30_1_TRIANGLES + TASK_33_1_TRIANGLES + TASK_34_1_TRIANGLES + TASK_35_1_TRIANGLES)
    expect(M3_LIGHT_COUNT).toBe(4)
    expect(MAX_LIGHTS).toBe(4)
    expect(report.textureCount).toBe(32)
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(7.6 * 1048576 + TASK_27_1_TEXTURE_BYTES)
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(8 * 1048576)
    expect(textureMemoryBytes(TEXTURE_SPECS.coneFalloff) / 1048576).toBeCloseTo(0.016, 3)
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    expect(liveTextureCount()).toBe(32)
    const spies = TEXTURE_IDS.map((id) => vi.spyOn(getSharedTexture(id)!, 'dispose'))
    disposeSharedResources()
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    console.info(
      '[25.1] triangles ' + report.totalTriangles + ' (delta ' + (report.totalTriangles - 19100) + '), textures ' + report.textureCount + ', texture memory ' + (report.textureMemoryBytes / 1048576).toFixed(3) + ' MB (computed)',
    )
  })
})
import { ARCADE_GLOW_SIZE, ARCADE_GLOW_Y, ARCADE_RUNNER_Y, arcadeFloorGlowParts } from './modelDetail'

describe('task 25.2 arcade floor glow decals', () => {
  afterEach(() => setCanvasFactory(null))
  const COLOURS = { snake: '22c55e', maze: 'e11d48', frequency: 'f59e0b' } as const
  const area = { minX: 5.3, maxX: 9.3, minZ: -2, maxZ: 2 }

  it('has three additive 0.26 floor glows with the exact cabinet colours, no depth write and the lampGlow map', () => {
    const parts = arcadeFloorGlowParts()
    expect(parts.map((p) => p.mat)).toEqual(['arcadeGlowSnake', 'arcadeGlowMaze', 'arcadeGlowFrequency'])
    const mats = [materials.arcadeGlowSnake, materials.arcadeGlowMaze, materials.arcadeGlowFrequency]
    expect(mats.map((m) => m.color.getHexString())).toEqual([COLOURS.snake, COLOURS.maze, COLOURS.frequency])
    for (const m of mats) {
      expect(m.blending).toBe(2)
      expect(m.depthWrite).toBe(false)
      expect(m.transparent).toBe(true)
      expect(m.opacity).toBeCloseTo(0.26, 9)
      expect(m.polygonOffset).toBe(true)
    }
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    for (const m of mats) expect(m.map).toBe(getSharedTexture('lampGlow'))
  })

  it('sits 0.6 m west of each arcade anchor, flat above the floor, above the runner, clear of the cables, inside the Arcade_Area and off every cabinet collider', () => {
    const anchors = ROOM.stations.filter((s) => s.id === 'arcade').map((s) => s.anchor)
    const parts = arcadeFloorGlowParts()
    expect(parts).toHaveLength(3)
    const runner = arcadeFloorParts().find((p) => p.mat === 'runner')!
    const cableTop = Math.max(...ROOM.props.filter((p) => p.id.startsWith('arcade-cable')).map((p) => p.height))
    parts.forEach((p, i) => {
      expect(GEOMETRY_TRIANGLES[p.geo]).toBe(2)
      expect(p.rot).toEqual([-Math.PI / 2, 0, 0])
      expect(p.pos[0]).toBeCloseTo(anchors[i].x - 0.6, 9)
      expect(p.pos[2]).toBeCloseTo(anchors[i].z, 9)
      expect(p.pos[1]).toBe(ARCADE_GLOW_Y)
      expect(p.pos[1]).toBeGreaterThan(0)
      expect(p.pos[1]).not.toBe(runner.pos[1])
      expect(p.pos[1]).toBeCloseTo(runner.pos[1] + 0.003, 9)
      expect(runner.pos[1]).toBe(ARCADE_RUNNER_Y)
      expect(p.pos[1]).not.toBe(cableTop)
      const box = { minX: p.pos[0] - ARCADE_GLOW_SIZE / 2, maxX: p.pos[0] + ARCADE_GLOW_SIZE / 2, minZ: p.pos[2] - ARCADE_GLOW_SIZE / 2, maxZ: p.pos[2] + ARCADE_GLOW_SIZE / 2 }
      expect(box.minX).toBeGreaterThanOrEqual(area.minX)
      expect(box.maxX).toBeLessThanOrEqual(area.maxX)
      expect(box.minZ).toBeGreaterThanOrEqual(area.minZ)
      expect(box.maxZ).toBeLessThanOrEqual(area.maxZ)
      for (const c of COLLIDERS) {
        const overlaps = box.minX < c.maxX && box.maxX > c.minX && box.minZ < c.maxZ && box.maxZ > c.minZ
        expect(overlaps, 'glow ' + i + ' overlaps a collider').toBe(false)
      }
    })
    // No collider or interactable is added: the colliders stay walls + frames + solid props.
    expect(COLLIDERS.length).toBe(ROOM.walls.length + 4 + ROOM.props.filter((p) => p.solid).length)
  })

  it('keeps the budgets: +6 triangles over 19,118, below 20,000, 4 lights, same texture memory, textures disposed once', () => {
    const report = sceneDetailReport()
    expect(report.objects.map((o) => o.name)).toContain('arcade-floor-glow')
    expect(report.objects.find((o) => o.name === 'arcade-floor-glow')!.triangles).toBe(6)
    expect(report.totalTriangles).toBe(19118 + 6 + TASK_26_1_TRIANGLES + TASK_27_1_TRIANGLES + TASK_28_2_TRIANGLES + TASK_30_1_TRIANGLES + TASK_33_1_TRIANGLES + TASK_34_1_TRIANGLES + TASK_35_1_TRIANGLES)
    expect(report.totalTriangles).toBeLessThan(SCENE_TRIANGLE_BUDGET)
    expect(M3_LIGHT_COUNT).toBe(4)
    expect(report.textureCount).toBe(32)
    expect(report.textureMemoryBytes / 1048576).toBeCloseTo(7.537 + TASK_27_1_TEXTURE_BYTES / 1048576, 2)
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(8 * 1048576)
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    expect(liveTextureCount()).toBe(32)
    const spies = TEXTURE_IDS.map((id) => vi.spyOn(getSharedTexture(id)!, 'dispose'))
    disposeSharedResources()
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
  })
})
describe('task 26.1: anisotropy, VCR chassis and mug detail', () => {
  afterEach(() => setCanvasFactory(null))
  const desk = prop('reception-desk')
  const crt = prop('crt-vhs')
  const aabb = (p: Part) => {
    const size: Vec3 = p.geo === 'plane' || p.geo === 'disc' ? [p.scale[0], p.scale[1], 0] : p.scale
    const h = orientedHalfExtents(size, p.rot ?? [0, 0, 0])
    return { lo: [p.pos[0] - h[0], p.pos[1] - h[1], p.pos[2] - h[2]], hi: [p.pos[0] + h[0], p.pos[1] + h[1], p.pos[2] + h[2]] }
  }
  const overlaps = (a: Part, b: Part) => {
    const A = aabb(a)
    const B = aabb(b)
    return [0, 1, 2].every((i) => Math.min(A.hi[i], B.hi[i]) - Math.max(A.lo[i], B.lo[i]) > 1e-6)
  }

  it('every shared CanvasTexture has anisotropy 4 and all 32 are disposed exactly once (twice-safe)', () => {
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    expect(liveTextureCount()).toBe(32)
    for (const id of TEXTURE_IDS) expect(getSharedTexture(id)!.anisotropy, id).toBe(4)
    const spies = TEXTURE_IDS.map((id) => vi.spyOn(getSharedTexture(id)!, 'dispose'))
    disposeSharedResources()
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
  })

  it('the VCR on the media console (vcrDeck material, 0.62 x 0.1 x 0.38 m) uses #2b303a as flat colour and its face texture when drawn', () => {
    const housing = vcrDeckParts(crt.box).filter((p) => p.mat === 'vcrDeck')
    expect(housing).toHaveLength(1)
    expect(housing[0].scale).toEqual([0.62, 0.1, 0.38])
    expect(VCR_CHASSIS_COLOR).toBe('#2b303a')
    expect(`#${materials.vcrDeck.color.getHexString()}`).toBe(VCR_CHASSIS_COLOR)
    expect(TEXTURE_SPECS.vcrDeck).toMatchObject({ width: 256, height: 128 })
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    expect(materials.vcrDeck.map).toBe(getSharedTexture('vcrDeck'))
  })

  it('the mug has a bright rim, a coffee surface on it and a coffee ring stain on the desk top, none overlapping another part', () => {
    const parts = deskParts(desk.box, desk.height)
    const rim = parts.find((p) => p.mat === 'mugRim')!
    const coffee = parts.find((p) => p.mat === 'coffee')!
    const stain = parts.find((p) => p.mat === 'coffeeStain')!
    expect(rim && coffee && stain).toBeTruthy()
    expect(`#${materials.mugRim.color.getHexString()}`).toBe('#f2b8a4')
    expect(coffee.pos[1] - MUG_COFFEE_H / 2).toBeCloseTo(rim.pos[1] + MUG_RIM_H / 2, 9)
    expect(stain.pos[1] - MUG_STAIN_H / 2).toBeCloseTo(desk.height, 9)
    expect(materials.coffeeStain.transparent).toBe(true)
    for (const p of [coffee, stain]) {
      for (const o of parts) if (o !== p && o.mat !== 'wood' && o.mat !== 'woodDark') expect(overlaps(p, o), `${p.mat} vs ${o.mat}`).toBe(false)
    }
  })

  it('keeps the budgets: at most the 20,000 cap triangles (computed), 4 lights, 32 textures within 7.85 MB', () => {
    const report = sceneDetailReport()
    expect(report.totalTriangles).toBeLessThanOrEqual(TRIANGLE_CAP)
    expect(report.totalTriangles - 19124).toBe(TASK_26_1_TRIANGLES + TASK_27_1_TRIANGLES + TASK_28_2_TRIANGLES + TASK_30_1_TRIANGLES + TASK_33_1_TRIANGLES + TASK_34_1_TRIANGLES + TASK_35_1_TRIANGLES)
    expect(M3_LIGHT_COUNT).toBe(4)
    expect(report.textureCount).toBe(32)
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(7.85 * 1048576)
  })
})

describe('task 27.1: cabinet front detail and manual spines (cabinetAndManualDetail)', () => {
  afterEach(() => setCanvasFactory(null))
  const R = CABINET_DETAIL_REGIONS
  const cabinet = (id: (typeof ARCADE_CABINET_IDS)[number]) => {
    const c = prop(id)
    const frame = facingFrame(c.box, c.facing)
    return { c, frame, parts: arcadeCabinetParts(frame.local, c.height, ARCADE_CABINET_GAMES[id]) }
  }
  const inRect = (u: number, v: number, r: { u0: number; u1: number; v0: number; v1: number }) =>
    u >= r.u0 - 1e-9 && u <= r.u1 + 1e-9 && v >= r.v0 - 1e-9 && v <= r.v1 + 1e-9
  /** Every uv of the 4 vertices of face `f`, as [u, v, x, y] with the vertex position. */
  const faceUvs = (g: ReturnType<typeof atlasBoxGeometry>, f: number) => {
    const uv = g.getAttribute('uv')
    const pos = g.getAttribute('position')
    return [0, 1, 2, 3].map((k) => [uv.getX(f * 4 + k), uv.getY(f * 4 + k), pos.getX(f * 4 + k), pos.getY(f * 4 + k)] as const)
  }

  it.each(ARCADE_CABINET_IDS)('%s: the coin door, kick plate and control deck use the texture through UV windows inside the left half', (id) => {
    const { parts } = cabinet(id)
    const door = parts.filter((p) => p.mat === 'cabinetPanel' && p.atlas && Math.abs(p.scale[1] - 0.34) < 1e-9)
    const kick = parts.filter((p) => p.mat === 'cabinetPanel' && p.atlas && Math.abs(p.scale[1] - 0.13) < 1e-9)
    const deck = parts.filter((p) => p.mat === 'deckPlate')
    expect([door.length, kick.length, deck.length]).toEqual([1, 1, 1])
    const expected: ReadonlyArray<readonly [Part, readonly number[]]> = [
      [door[0], R.door],
      [kick[0], R.kick],
      [deck[0], R.lip],
    ]
    for (const [p, px] of expected) {
      expect(p.geo).toBe('box') // existing 12-triangle box: zero new triangles
      expect(p.atlas!.faces).toEqual([BOX_FACE_FRONT])
      expect(p.atlas!.rect).toEqual(detailUvRect(px as never))
      for (const r of [p.atlas!.rect, p.atlas!.plain]) {
        expect(r.u0).toBeGreaterThanOrEqual(0)
        expect(r.u1).toBeLessThanOrEqual(0.5)
        expect(r.u0).toBeLessThan(r.u1)
        expect(r.v0).toBeLessThan(r.v1)
      }
    }
    expect(deck[0].atlas!.plain).toEqual(detailUvRect(R.plainDark))
    expect(door[0].atlas!.plain).toEqual(detailUvRect(R.plainSteel))
    // The three windows are different draw groups.
    expect(new Set([door[0], kick[0], deck[0]].map(partGroupKey)).size).toBe(3)
    // Nothing else of the cabinet changed: grilles, slots, molding and marquee keep their materials.
    expect(parts.filter((p) => p.mat === 'grille')).toHaveLength(3)
    expect(parts.filter((p) => p.mat === 'coinGlow')).toHaveLength(4)
    expect(parts.filter((p) => p.mat === 'metal')).toHaveLength(parts.filter((p) => p.mat === 'metal' && p.geo === 'cylinderLow').length)
  })

  it.each(ARCADE_CABINET_IDS)('%s: the textured face is +z, the face the player sees (the cabinet faces -X)', (id) => {
    const { c, frame, parts } = cabinet(id)
    // The group rotates local +z onto the facing direction: world normal = (sin yaw, cos yaw).
    const nx = Math.sin(frame.rotationY)
    const nz = Math.cos(frame.rotationY)
    expect(c.facing).toBe('-x')
    expect(nx).toBeCloseTo(-1, 9)
    expect(nz).toBeCloseTo(0, 9)
    for (const p of parts.filter((q) => q.atlas)) {
      const g = atlasBoxGeometry(p.scale[0], p.scale[1], p.scale[2], p.atlas!.rect, p.atlas!.faces, p.atlas!.plain)
      const { rect, plain } = p.atlas!
      // Face 4 (+z) covers the whole window, upright: the +x +y corner is the top-right of the window.
      const front = faceUvs(g, BOX_FACE_FRONT)
      for (const [u, v, x, y] of front) {
        expect(u).toBeCloseTo(x > 0 ? rect.u1 : rect.u0, 9)
        expect(v).toBeCloseTo(y > 0 ? rect.v1 : rect.v0, 9)
      }
      // Every other face is the flat plain stripe.
      for (const f of [0, 1, 2, 3, 5]) for (const [u, v] of faceUvs(g, f)) expect(inRect(u, v, plain), `${p.mat} face ${f}`).toBe(true)
      // The coin door and kick plate stand in front of the cabinet body front (local z = maxZ), facing +z.
      if (p.mat === 'cabinetPanel') expect(p.pos[2] + p.scale[2] / 2, `${p.mat} front`).toBeGreaterThan(frame.local.maxZ)
    }
  })

  it('caches atlas boxes by size and window, and disposes each once (twice-safe)', () => {
    disposeSharedResources() // start from an empty cache
    const { parts } = cabinet('arcade-snake')
    const geos = parts.filter((p) => p.atlas).map((p) => atlasBoxGeometry(p.scale[0], p.scale[1], p.scale[2], p.atlas!.rect, p.atlas!.faces, p.atlas!.plain))
    expect(atlasBoxCount()).toBe(3)
    // The other cabinets have the same sizes and windows, so they share the same three geometries.
    for (const id of ARCADE_CABINET_IDS) {
      for (const p of cabinet(id).parts.filter((q) => q.atlas)) {
        expect(geos).toContain(atlasBoxGeometry(p.scale[0], p.scale[1], p.scale[2], p.atlas!.rect, p.atlas!.faces, p.atlas!.plain))
      }
    }
    expect(atlasBoxCount()).toBe(3)
    const spies = geos.map((g) => vi.spyOn(g, 'dispose'))
    disposeSharedResources()
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(atlasBoxCount()).toBe(0)
  })

  it('the three manuals map their own spine strip of the right half onto the +z (spine) face, and the cover stripe onto every other face', () => {
    const p = prop(MANUAL_PLACEMENT.shelfId)
    const manuals = shelfContents(p.id, p.box, p.height).instances.filter((b) => b.manualId)
    expect(manuals.map((b) => b.manualId)).toEqual([...MANUAL_STRIP_KEYS])
    manuals.forEach((b, i) => {
      const strip = detailUvRect(R.strips[i])
      const cover = detailUvRect(R.covers[i])
      const plain = detailUvRect(R.plains[i])
      expect(strip.u0).toBeGreaterThanOrEqual(0.5)
      expect(strip.u1).toBeLessThanOrEqual(1)
      const g = manualGeometries[b.manualId!]
      for (const [u, v, x, y] of faceUvs(g, BOX_FACE_FRONT)) {
        expect(u).toBeCloseTo(x > 0 ? strip.u1 : strip.u0, 9)
        expect(v).toBeCloseTo(y > 0 ? strip.v1 : strip.v0, 9)
      }
      // Task 28.2: the two side faces (+x and -x of the box) show the cover panel, the rest the plain cloth.
      for (const f of [0, 1]) for (const [u, v] of faceUvs(g, f)) expect(inRect(u, v, cover), `${b.manualId} face ${f}`).toBe(true)
      for (const f of [2, 3, 5]) for (const [u, v] of faceUvs(g, f)) expect(inRect(u, v, plain), `${b.manualId} face ${f}`).toBe(true)
      // The instance keeps its colour, size and yaw, and the spine (+z) turns to +X, toward the room.
      expect(b.rot[1]).toBeCloseTo(Math.PI / 2, 9)
      expect(Math.sin(b.rot[1])).toBeCloseTo(1, 9)
      expect(Math.cos(b.rot[1])).toBeCloseTo(0, 9)
      expect(b.size).toEqual([...MANUAL_SIZE])
    })
    expect(new Set(MANUAL_STRIP_KEYS.map((k) => manualGeometries[k])).size).toBe(3)
    // The strips do not overlap each other.
    for (let i = 1; i < 3; i++) expect(detailUvRect(R.strips[i - 1]).u1).toBeLessThanOrEqual(detailUvRect(R.strips[i]).u0)
  })

  it('the manual geometries are disposed exactly once per disposeSharedResources()', () => {
    const spies = MANUAL_STRIP_KEYS.map((k) => vi.spyOn(manualGeometries[k], 'dispose'))
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
  })

  it('no separate cream band parts remain, so the shelf objects cost 36 triangles less', () => {
    const p = prop(MANUAL_PLACEMENT.shelfId)
    const obj = declaredObjects().find((o) => o.name === p.id)!
    expect(obj.parts.some((q) => (q.mat as string) === 'manualBand')).toBe(false)
    expect(Object.keys(materials)).not.toContain('manualBand')
    // Each manual is its own draw call (own geometry); ordinary books still group by variant.
    const contents = shelfContents(p.id, p.box, p.height)
    const variants = new Set(contents.instances.filter((b) => !b.manualId).map((b) => b.variant)).size
    expect(obj.extraDrawCalls).toBe(variants + 3)
  })

  it('binds cabinetAndManualDetail to the door and kick plate, the control deck and the manual books with white multipliers; flat colours return after dispose', () => {
    setCanvasFactory(null) // drop any texture left by an earlier test
    expect(materials.cabinetPanel.map).toBeNull()
    expect(`#${materials.cabinetPanel.color.getHexString()}`).toBe('#777c86')
    expect(`#${materials.deckPlate.color.getHexString()}`).toBe('#1a1b22')
    expect(`#${materials.manualBook.color.getHexString()}`).toBe('#ffffff')
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    const tex = getSharedTexture('cabinetAndManualDetail')!
    expect(tex).not.toBeNull()
    for (const m of [materials.cabinetPanel, materials.deckPlate, materials.manualBook]) {
      expect(m.map).toBe(tex)
      expect(m.color.getHexString()).toBe('ffffff')
    }
    expect(tex.anisotropy).toBe(4)
    expect(tex.image.width).toBe(256)
    expect(tex.image.height).toBe(128)
    const spy = vi.spyOn(tex, 'dispose')
    disposeSharedResources()
    disposeSharedResources()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(materials.cabinetPanel.map).toBeNull()
    expect(`#${materials.cabinetPanel.color.getHexString()}`).toBe('#777c86')
    expect(`#${materials.deckPlate.color.getHexString()}`).toBe('#1a1b22')
    expect(`#${materials.manualBook.color.getHexString()}`).toBe('#ffffff')
  })

  it('without a canvas the texture is null and the materials keep their flat look', () => {
    setCanvasFactory(() => null)
    ensureSharedTextures()
    expect(getSharedTexture('cabinetAndManualDetail')).toBeNull()
    expect(materials.cabinetPanel.map).toBeNull()
    expect(materials.deckPlate.map).toBeNull()
    expect(materials.manualBook.map).toBeNull()
  })

  it('keeps the budgets: triangles at most the 20,000 cap and not above 19,188 (delta -36), 4 lights, 32 textures, memory at most 7.85 MB', () => {
    const report = sceneDetailReport()
    expect(report.totalTriangles).toBeLessThanOrEqual(TRIANGLE_CAP)
    expect(report.totalTriangles - 19188).toBeLessThanOrEqual(TASK_30_1_TRIANGLES + TASK_35_1_TRIANGLES)
    expect(report.totalTriangles - 19188).toBe(TASK_27_1_TRIANGLES + TASK_28_2_TRIANGLES + TASK_30_1_TRIANGLES + TASK_33_1_TRIANGLES + TASK_34_1_TRIANGLES + TASK_35_1_TRIANGLES)
    expect(M3_LIGHT_COUNT).toBe(4)
    expect(MAX_LIGHTS).toBe(4)
    expect(report.textureCount).toBe(32)
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(7.85 * 1048576)
    expect(totalTextureMemoryBytes() - 7.537 * 1048576).toBeCloseTo(TASK_27_1_TEXTURE_BYTES, -4)
    expect(report.totalDrawCalls).toBeLessThan(DRAW_CALL_CAP)
  })

  it('every one of the 32 textures has anisotropy 4 and is disposed exactly once, twice-safe', () => {
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    expect(liveTextureCount()).toBe(32)
    expect(TEXTURE_IDS).toContain('cabinetAndManualDetail')
    for (const id of TEXTURE_IDS) expect(getSharedTexture(id)!.anisotropy, id).toBe(4)
    const spies = TEXTURE_IDS.map((id) => vi.spyOn(getSharedTexture(id)!, 'dispose'))
    disposeSharedResources()
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(liveTextureCount()).toBe(0)
  })
})

describe('task 28.2: protruding manual volumes with spine and cover art', () => {
  afterEach(() => setCanvasFactory(null))
  const p = prop(MANUAL_PLACEMENT.shelfId)
  const c = shelfContents(p.id, p.box, p.height)
  const inner = shelfInnerBounds(p.box, p.height)
  const lv = inner.levels[MANUAL_PLACEMENT.level]
  const manuals = c.instances.filter((b) => b.group === 'manual')
  type Box3d = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
  const ext = (b: { size: Vec3; rot: Vec3; pos: Vec3 }): Box3d => {
    const h = orientedHalfExtents(b.size, b.rot)
    return { minX: b.pos[0] - h[0], maxX: b.pos[0] + h[0], minY: b.pos[1] - h[1], maxY: b.pos[1] + h[1], minZ: b.pos[2] - h[2], maxZ: b.pos[2] + h[2] }
  }
  const partExt = (q: Part): Box3d => ({
    minX: q.pos[0] - q.scale[0] / 2,
    maxX: q.pos[0] + q.scale[0] / 2,
    minY: q.pos[1] - q.scale[1] / 2,
    maxY: q.pos[1] + q.scale[1] / 2,
    minZ: q.pos[2] - q.scale[2] / 2,
    maxZ: q.pos[2] + q.scale[2] / 2,
  })
  /** True when the open interiors of two boxes overlap (touching faces are allowed, 1e-6 tolerance). */
  const intersects = (a: Box3d, b: Box3d) =>
    a.minX < b.maxX - 1e-6 && a.maxX > b.minX + 1e-6 && a.minY < b.maxY - 1e-6 && a.maxY > b.minY + 1e-6 && a.minZ < b.maxZ - 1e-6 && a.maxZ > b.minZ + 1e-6
  const inRect = (u: number, v: number, r: { u0: number; u1: number; v0: number; v1: number }) =>
    u >= r.u0 - 1e-9 && u <= r.u1 + 1e-9 && v >= r.v0 - 1e-9 && v <= r.v1 + 1e-9
  const faceUvs = (g: (typeof manualGeometries)[(typeof MANUAL_STRIP_KEYS)[number]], f: number) => {
    const uv = g.getAttribute('uv')
    return [0, 1, 2, 3].map((k) => [uv.getX(f * 4 + k), uv.getY(f * 4 + k)] as const)
  }

  it('each manual is 0.085 x 0.31 x 0.29 m (the 0.31 m height fits under the next board with at least 3 mm to spare)', () => {
    expect([...MANUAL_SIZE]).toEqual([0.085, 0.31, 0.29])
    expect(lv.ceil - lv.floor - 0.31).toBeGreaterThanOrEqual(0.003)
    expect(manuals).toHaveLength(3)
    for (const b of manuals) {
      expect(b.size).toEqual([0.085, 0.31, 0.29])
      const e = ext(b)
      // Thickness runs along the shelf (z), depth along x.
      expect(e.maxZ - e.minZ).toBeCloseTo(0.085, 9)
      expect(e.maxX - e.minX).toBeCloseTo(0.29, 9)
      expect(e.maxY - e.minY).toBeCloseTo(0.31, 9)
    }
  })

  it('the spine face is at x -4.555, 0.08 m further toward +x than the flush spine line (-4.635), and sticks out 0.045 m past the bookcase front', () => {
    const FLUSH_SPINE_X = -4.635
    for (const b of manuals) {
      const e = ext(b)
      expect(e.maxX).toBeCloseTo(-4.555, 9)
      expect(e.minX).toBeCloseTo(-4.845, 9)
      expect(e.maxX - FLUSH_SPINE_X).toBeCloseTo(0.08, 9)
      expect(e.maxX - p.box.maxX).toBeCloseTo(0.045, 9)
      expect(e.maxX).toBeGreaterThan(p.box.maxX)
    }
    expect(manuals.map((b) => b.pos[2])).toEqual([1.4, 1.8, 2.2].map((z) => expect.closeTo(z, 9)))
    expect(MANUAL_PLACEMENT.spineX).toBe(-4.555)
    expect(MANUAL_PLACEMENT.backX).toBe(-4.845)
  })

  it('stands on its board and stays inside the level vertically', () => {
    for (const b of manuals) {
      const e = ext(b)
      expect(e.minY).toBeCloseTo(lv.floor, 9)
      expect(e.maxY).toBeLessThanOrEqual(lv.ceil - 0.003 + 1e-9)
    }
  })

  it('does not intersect the carcass (back panel, boards, side panels) or the cardboard box parts', () => {
    const frame = shelfFrameParts(p.box, p.height)
    for (const b of manuals) {
      const e = ext(b)
      for (const q of [...frame, ...c.boxParts]) expect(intersects(e, partExt(q)), `${b.manualId} vs ${q.mat} at ${q.pos.map((v) => v.toFixed(3)).join(',')}`).toBe(false)
    }
  })

  it('does not intersect any neighbouring book, and the leaning and stacked items of that shelf stay supported', () => {
    for (const m of manuals) {
      for (const b of c.instances.filter((q) => q !== m)) expect(intersects(ext(m), ext(b)), `${m.manualId} vs ${b.group} at z ${b.pos[2].toFixed(3)}`).toBe(false)
    }
    c.instances.forEach((b, i) => {
      if (b.group === 'lean') {
        // A leaning book always rests on the row book placed right after it.
        expect(c.instances[i + 1]?.group, `lean at ${i}`).toBe('row')
        expect(c.instances[i + 1].level).toBe(b.level)
      }
    })
    // Every stack keeps its full set of layers (2 to 4), so none loses its lower books.
    const perLevel = new Map<number, number>()
    for (const b of c.instances.filter((q) => q.group === 'stack')) perLevel.set(b.level, (perLevel.get(b.level) ?? 0) + 1)
    for (const [level, n] of perLevel) expect(n, `stack level ${level}`).toBeGreaterThanOrEqual(2)
    // Deterministic: a second call returns the same layout.
    expect(shelfContents(p.id, p.box, p.height)).toEqual(c)
    // The cardboard box of the manual level is complete or gone, never half of it.
    const levelBoxParts = c.boxParts.filter((q) => q.pos[1] >= lv.floor - 1e-6 && q.pos[1] <= lv.ceil)
    expect([0, 5]).toContain(levelBoxParts.length)
  })

  it('the manuals are not colliders: they do not touch any solid footprint outside the bookcase and leave the 1.2 m walkway in front of it clear', () => {
    for (const b of manuals) {
      const e = ext(b)
      for (const col of COLLIDERS) {
        if (col === p.box) continue
        expect(e.maxX <= col.minX + 1e-9 || e.minX >= col.maxX - 1e-9 || e.maxZ <= col.minZ + 1e-9 || e.minZ >= col.maxZ - 1e-9).toBe(true)
      }
      // Only the part inside the bookcase footprint overlaps it; everything in front of it is free floor.
      expect(e.maxX - p.box.maxX).toBeLessThan(0.05)
    }
    // The walkway strip x -4.6 .. -3.4 holds no collider, with or without the books.
    const walkway = { minX: -4.6, maxX: -3.4, minZ: 0.4, maxZ: 2.6 }
    for (const col of COLLIDERS) {
      expect(col.maxX <= walkway.minX + 1e-9 || col.minX >= walkway.maxX - 1e-9 || col.maxZ <= walkway.minZ || col.minZ >= walkway.maxZ).toBe(true)
    }
    expect(manuals.every((b) => ext(b).maxX < walkway.minX + 0.05)).toBe(true)
    for (const def of INTERACTABLE_DEFS.filter((d) => d.kind === 'manual')) expect(COLLIDERS).not.toContain(def.collider)
  })

  it('maps the spine strip onto +x, the cover panel onto both side faces (world +z and -z), and plain cloth onto the top, bottom and back', () => {
    const R = CABINET_DETAIL_REGIONS
    manuals.forEach((b, i) => {
      // After the yaw of pi/2 the box +z face (spine) points to +x, and its +x / -x faces point to -z / +z.
      expect(Math.sin(b.rot[1])).toBeCloseTo(1, 9)
      expect(Math.cos(b.rot[1])).toBeCloseTo(0, 9)
      const g = manualGeometries[b.manualId!]
      const strip = detailUvRect(R.strips[i])
      const cover = detailUvRect(R.covers[i])
      const plain = detailUvRect(R.plains[i])
      for (const [u, v] of faceUvs(g, BOX_FACE_FRONT)) expect(inRect(u, v, strip), `${b.manualId} spine`).toBe(true)
      for (const f of [0, 1]) for (const [u, v] of faceUvs(g, f)) expect(inRect(u, v, cover), `${b.manualId} cover face ${f}`).toBe(true)
      for (const f of [2, 3, 5]) for (const [u, v] of faceUvs(g, f)) expect(inRect(u, v, plain), `${b.manualId} plain face ${f}`).toBe(true)
      // The strip, cover and plain regions do not overlap, so spine art never shows on a cover.
      expect(strip.u1 <= cover.u0 || cover.u1 <= strip.u0).toBe(true)
      expect(plain.u0).toBeGreaterThanOrEqual(cover.u1 - 1e-9)
    })
    expect(new Set(MANUAL_STRIP_KEYS.map((k) => manualGeometries[k])).size).toBe(3)
    // One box per manual: 12 triangles (36 index triplets of a BoxGeometry).
    for (const k of MANUAL_STRIP_KEYS) expect(manualGeometries[k].getIndex()!.count / 3).toBe(GEOMETRY_TRIANGLES.box)
  })

  it('colour decision: the exact cloth colours are painted into the texture and the manuals multiply it by white', () => {
    expect(MANUAL_COVER_COLOURS.map((h) => h)).toEqual(['#16a34a', '#e11d48', '#f59e0b'])
    expect(manuals.map((b) => MANUAL_BOOKS[b.manualId!].cover)).toEqual(['#16a34a', '#e11d48', '#f59e0b'])
    expect(manuals.map((b) => instanceColour(b))).toEqual(['#ffffff', '#ffffff', '#ffffff'])
    expect(`#${materials.manualBook.color.getHexString()}`).toBe('#ffffff')
  })

  it('keeps the budgets with zero added triangles: at most the 20,000 cap and 36 fewer than 19,152 (three displaced books), 4 lights, 32 textures and unchanged texture memory (at most 7.85 MB)', () => {
    const report = sceneDetailReport()
    const BEFORE_28_2 = 19188 + TASK_27_1_TRIANGLES
    expect(BEFORE_28_2).toBe(19152)
    expect(report.totalTriangles).toBeLessThanOrEqual(TRIANGLE_CAP)
    // The manuals add no triangles; the wider volumes displace three ordinary books, so the total can only go down.
    expect(report.totalTriangles - BEFORE_28_2).toBe(TASK_28_2_TRIANGLES + TASK_30_1_TRIANGLES + TASK_33_1_TRIANGLES + TASK_34_1_TRIANGLES + TASK_35_1_TRIANGLES)
    expect(report.totalTriangles - BEFORE_28_2).toBeLessThanOrEqual(TASK_30_1_TRIANGLES + TASK_34_1_TRIANGLES + TASK_35_1_TRIANGLES)
    expect(M3_LIGHT_COUNT).toBe(4)
    expect(MAX_LIGHTS).toBe(4)
    expect(report.textureCount).toBe(32)
    expect(report.textureMemoryBytes).toBeLessThanOrEqual(7.85 * 1048576)
    expect(TEXTURE_SPECS.cabinetAndManualDetail).toMatchObject({ width: 256, height: 128 })
    expect(textureMemoryBytes(TEXTURE_SPECS.cabinetAndManualDetail)).toBe(TASK_27_1_TEXTURE_BYTES)
    expect(report.textureMemoryBytes / 1048576).toBeCloseTo(7.703, 3)
    console.info(`[28.2] triangles ${report.totalTriangles} (delta ${report.totalTriangles - BEFORE_28_2}), textures ${report.textureCount}, texture memory ${(report.textureMemoryBytes / 1048576).toFixed(3)} MiB (computed)`)
  })

  it('disposes the cached manual geometries and the shared texture exactly once per disposeSharedResources()', () => {
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    const tex = getSharedTexture('cabinetAndManualDetail')!
    const texSpy = vi.spyOn(tex, 'dispose')
    const geoSpies = MANUAL_STRIP_KEYS.map((k) => vi.spyOn(manualGeometries[k], 'dispose'))
    disposeSharedResources()
    expect(texSpy).toHaveBeenCalledTimes(1)
    for (const s of geoSpies) expect(s).toHaveBeenCalledTimes(1)
    disposeSharedResources()
    expect(texSpy).toHaveBeenCalledTimes(1)
  })
})

describe('task 29.2: animated attract screens in the shared resources', () => {
  afterEach(() => setCanvasFactory(null))

  const ATTRACT = ['attractSnake', 'attractMaze', 'attractFrequency'] as const

  it('redraws only the three attract canvases in place, flags only their textures, and creates no canvas', async () => {
    const { updateAnimatedAttractTextures } = await import('./sharedResources')
    const canvases: ReturnType<typeof fakeCanvas>[] = []
    const factory = vi.fn(() => {
      const c = fakeCanvas()
      canvases.push(c)
      return c
    })
    setCanvasFactory(factory)
    ensureSharedTextures()
    expect(factory).toHaveBeenCalledTimes(TEXTURE_IDS.length)
    const textures = new Map(TEXTURE_IDS.map((id) => [id, getSharedTexture(id)!]))
    const versions = new Map(TEXTURE_IDS.map((id) => [id, textures.get(id)!.version]))
    const callCounts = canvases.map((c) => c.ctx.calls.length)
    const colorBefore = ATTRACT.map((id) => (id === 'attractSnake' ? materials.arcadeScreenSnake : id === 'attractMaze' ? materials.arcadeScreenMaze : materials.arcadeScreenFrequency).color.getHexString())

    updateAnimatedAttractTextures(1.5)
    updateAnimatedAttractTextures(3.1)

    expect(factory).toHaveBeenCalledTimes(TEXTURE_IDS.length)
    expect(liveTextureCount()).toBe(TEXTURE_IDS.length)
    for (const id of TEXTURE_IDS) {
      const tex = textures.get(id)!
      expect(getSharedTexture(id), id).toBe(tex)
      const expected = (ATTRACT as readonly string[]).includes(id) ? 2 : 0
      expect(tex.version - versions.get(id)!, id).toBe(expected)
    }
    TEXTURE_IDS.forEach((id, i) => {
      const grew = canvases[i].ctx.calls.length > callCounts[i]
      expect(grew, id).toBe((ATTRACT as readonly string[]).includes(id))
      if (grew) expect(canvases[i].ctx.calls.filter((c) => c.op === 'clearRect').length, id).toBe(2)
    })
    // The material colour (Memory_Shift tint) is not touched by a redraw.
    expect(ATTRACT.map((id) => (id === 'attractSnake' ? materials.arcadeScreenSnake : id === 'attractMaze' ? materials.arcadeScreenMaze : materials.arcadeScreenFrequency).color.getHexString())).toEqual(colorBefore)
    expect(materials.arcadeScreenSnake.map).toBe(textures.get('attractSnake'))
  })

  it('is a no-op without a canvas and after dispose', async () => {
    const { updateAnimatedAttractTextures } = await import('./sharedResources')
    setCanvasFactory(null)
    expect(() => updateAnimatedAttractTextures(1)).not.toThrow()
    expect(liveTextureCount()).toBe(0)
    const canvases: ReturnType<typeof fakeCanvas>[] = []
    setCanvasFactory(() => {
      const c = fakeCanvas()
      canvases.push(c)
      return c
    })
    ensureSharedTextures()
    disposeSharedResources()
    const counts = canvases.map((c) => c.ctx.calls.length)
    expect(() => updateAnimatedAttractTextures(2)).not.toThrow()
    expect(canvases.map((c) => c.ctx.calls.length)).toEqual(counts)
    expect(liveTextureCount()).toBe(0)
  })

  it('keeps the budgets: 32 textures, 7.703 MiB, 19,116 triangles, 4 lights, and every texture disposed exactly once', async () => {
    const { updateAnimatedAttractTextures } = await import('./sharedResources')
    const report = sceneDetailReport()
    expect(report.textureCount).toBe(32)
    expect(report.textureMemoryBytes / 1048576).toBeCloseTo(7.703, 3)
    expect(report.totalTriangles).toBe(19116 + TASK_30_1_TRIANGLES + TASK_33_1_TRIANGLES + TASK_34_1_TRIANGLES + TASK_35_1_TRIANGLES)
    expect(report.totalTriangles).toBeLessThanOrEqual(TRIANGLE_CAP)
    expect(M3_LIGHT_COUNT).toBe(4)
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    updateAnimatedAttractTextures(0.5)
    const spies = TEXTURE_IDS.map((id) => vi.spyOn(getSharedTexture(id)!, 'dispose'))
    disposeSharedResources()
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
  })

  it('the maze photo glow pulse keeps at most 3 direction changes per rolling second', async () => {
    const { mazePhotoPulse } = await import('./proceduralTextures')
    const { countDirectionChanges } = await import('../logic/palette')
    const rate = 240
    for (const i of [0, 1, 2]) {
      const samples = Array.from({ length: rate * 20 }, (_, k) => mazePhotoPulse(k / rate, i))
      for (let s = 0; s + rate <= samples.length; s += 24) expect(countDirectionChanges(samples.slice(s, s + rate + 1))).toBeLessThanOrEqual(3)
    }
  })
})

import { Color as ThreeColor } from 'three'
import { DESK_CASSETTE_DX, FIXTURE_STEEL_UV } from './modelDetail'
import { CABINET_PLAIN_V as STEEL_PLAIN_V } from './proceduralTextures'
import { VHS_SHELL_REGIONS, cassetteBoxCount, cassetteBoxGeometry, vhsShellUvRect } from './sharedResources'

describe('task 31.2: desk cassette and ceiling fixture texture polish', () => {
  afterEach(() => setCanvasFactory(null))
  const desk = () => prop('reception-desk')
  const deskAll = () => deskParts(desk().box, desk().height)
  const cassettes = () => deskAll().filter((p) => p.cassette)
  const hexOf = (c: { getHexString(): string }) => `#${c.getHexString()}`

  it('the three desk cassettes use tapeBlack: flat fallback #2a2d36, textured multiplier lifted so base x multiplier is about #2a2d36', () => {
    expect(cassettes()).toHaveLength(3)
    for (const p of cassettes()) {
      expect(p.mat).toBe('tapeBlack')
      expect(p.geo).toBe('box')
    }
    setCanvasFactory(null)
    ensureSharedTextures()
    expect(hexOf(materials.tapeBlack.color)).toBe('#2a2d36')
    expect(materials.tapeBlack.map).toBeNull()
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    expect(materials.tapeBlack.map).toBe(getSharedTexture('vhsShell'))
    expect(hexOf(materials.tapeBlack.color)).toBe('#474b54')
    // The vhsShell base is #a4a4ac; its product with the multiplier lands on the charcoal target in linear light.
    const base = new ThreeColor('#a4a4ac')
    const target = new ThreeColor('#2a2d36')
    const m = materials.tapeBlack.color
    expect(base.r * m.r).toBeCloseTo(target.r, 2)
    expect(base.g * m.g).toBeCloseTo(target.g, 2)
    expect(base.b * m.b).toBeCloseTo(target.b, 2)
    // The multiplier is lighter than the old #303038, so the white label sticker (about #e6e2d2) is no longer near-black.
    expect(m.r).toBeGreaterThan(new ThreeColor('#303038').r)
    expect(m.r).toBeLessThan(0.1)
    disposeSharedResources()
    expect(hexOf(materials.tapeBlack.color)).toBe('#2a2d36')
  })

  it('the cassette faces sample UV windows inside the vhsShell label, window and spine-label regions, upright', () => {
    const [p] = cassettes()
    const g = cassetteBoxGeometry(p.scale[0], p.scale[1], p.scale[2])
    const uv = g.getAttribute('uv')
    const pos = g.getAttribute('position')
    const top = vhsShellUvRect(VHS_SHELL_REGIONS.top)
    const front = vhsShellUvRect(VHS_SHELL_REGIONS.front)
    const plain = vhsShellUvRect(VHS_SHELL_REGIONS.plain)
    const inside = (i: number, r: { u0: number; u1: number; v0: number; v1: number }) =>
      uv.getX(i) >= r.u0 - 1e-9 && uv.getX(i) <= r.u1 + 1e-9 && uv.getY(i) >= r.v0 - 1e-9 && uv.getY(i) <= r.v1 + 1e-9
    for (let i = 0; i < uv.count; i++) {
      const face = Math.floor(i / 4)
      expect(inside(i, face === 2 ? top : face === 4 ? front : plain), `vertex ${i} face ${face}`).toBe(true)
    }
    // Pixel regions: the top window holds the label strip (rows 72..86), the reel window (rows 88..108) and the flap seam (row 69);
    // the front holds the ARCHIVE sticker (rows 111..124, x 14..114).
    const [tx0, ty0, tx1, ty1] = VHS_SHELL_REGIONS.top
    expect([tx0 <= 12, tx1 >= 116, ty0 <= 69, ty1 >= 108]).toEqual([true, true, true, true])
    const [fx0, fy0, fx1, fy1] = VHS_SHELL_REGIONS.front
    expect([fx0 <= 14, fx1 >= 114, fy0 <= 111, fy1 >= 124]).toEqual([true, true, true, true])
    // Exact rectangles (0.5 px inset, canvas top is v = 1).
    expect(top).toEqual({ u0: 10.5 / 128, u1: 117.5 / 128, v0: 1 - 108.5 / 128, v1: 1 - 61.5 / 128 })
    expect(front).toEqual({ u0: 12.5 / 128, u1: 115.5 / 128, v0: 1 - 125.5 / 128, v1: 1 - 109.5 / 128 })
    // Upright: on the top face u grows with +x and v grows toward -z (the far edge is the top of the label); on the front face v grows with +y.
    const grows = (face: number, a: 'x' | 'y' | 'z', c: 'u' | 'v') => {
      const idx = [0, 1, 2, 3].map((k) => face * 4 + k)
      const lo = idx.reduce((m, i) => (pos[`get${a.toUpperCase()}` as 'getX'](i) < pos[`get${a.toUpperCase()}` as 'getX'](m) ? i : m))
      const hi = idx.reduce((m, i) => (pos[`get${a.toUpperCase()}` as 'getX'](i) > pos[`get${a.toUpperCase()}` as 'getX'](m) ? i : m))
      return (c === 'u' ? uv.getX(hi) - uv.getX(lo) : uv.getY(hi) - uv.getY(lo)) > 0
    }
    expect(grows(2, 'x', 'u')).toBe(true)
    expect(grows(2, 'z', 'v')).toBe(false)
    expect(grows(4, 'x', 'u')).toBe(true)
    expect(grows(4, 'y', 'v')).toBe(true)
    // Cached by size: the same geometry is shared and counted once.
    expect(cassetteBoxGeometry(p.scale[0], p.scale[1], p.scale[2])).toBe(g)
    expect(cassetteBoxCount()).toBe(1)
    const spy = vi.spyOn(g, 'dispose')
    disposeSharedResources()
    disposeSharedResources()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(cassetteBoxCount()).toBe(0)
  })

  it('the loose cassette rests on the desk top, stays inside its footprint and overlaps no other desk part', () => {
    const parts = deskAll()
    const top = desk().height
    const slab = parts[1]
    const c = parts.find((p) => p.cassette && p.rot)!
    expect(c.pos[0] - desk().box.minX).toBeGreaterThan(0)
    expect(c.pos[0]).toBeCloseTo((desk().box.minX + desk().box.maxX) / 2 + DESK_CASSETTE_DX, 9)
    expect(c.pos[1] - c.scale[1] / 2).toBeCloseTo(top, 9)
    type P2 = readonly [number, number]
    const corners = (q: Part): P2[] => {
      const th = q.rot?.[1] ?? 0
      const cs = Math.cos(th)
      const sn = Math.sin(th)
      return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([a, b]) => {
        const x = (a * q.scale[0]) / 2
        const z = (b * q.scale[2]) / 2
        return [q.pos[0] + x * cs + z * sn, q.pos[2] - x * sn + z * cs] as P2
      })
    }
    const cc = corners(c)
    for (const [x, z] of cc) {
      expect(x).toBeGreaterThan(slab.pos[0] - slab.scale[0] / 2)
      expect(x).toBeLessThan(slab.pos[0] + slab.scale[0] / 2)
      expect(z).toBeGreaterThan(slab.pos[2] - slab.scale[2] / 2)
      expect(z).toBeLessThan(slab.pos[2] + slab.scale[2] / 2)
    }
    const axes = (poly: P2[]) => [0, 1].map((i) => [poly[i + 1][1] - poly[i][1], poly[i][0] - poly[i + 1][0]] as P2)
    const project = (poly: P2[], a: P2) => {
      const d = poly.map((p) => p[0] * a[0] + p[1] * a[1])
      return [Math.min(...d), Math.max(...d)] as const
    }
    const overlapsPoly = (poly: P2[]) =>
      [...axes(cc), ...axes(poly)].every((a) => {
        const [a0, a1] = project(cc, a)
        const [b0, b1] = project(poly, a)
        return a0 < b1 - 1e-9 && b0 < a1 - 1e-9
      })
    let checked = 0
    for (const q of parts) {
      if (q === c || q.rot?.[0] || q.rot?.[2]) continue
      const lo = q.pos[1] - q.scale[1] / 2
      const hi = q.pos[1] + q.scale[1] / 2
      if (!(lo < c.pos[1] + c.scale[1] / 2 - 1e-9 && hi > c.pos[1] - c.scale[1] / 2 + 1e-9)) continue
      checked++
      if (q.geo === 'box') expect(overlapsPoly(corners(q)), `${q.mat} at ${q.pos.map((v) => v.toFixed(3)).join(',')}`).toBe(false)
      else {
        // Upright round part: distance from its centre to the cassette rectangle must exceed its radius.
        const th = c.rot![1]
        const dx = q.pos[0] - c.pos[0]
        const dz = q.pos[2] - c.pos[2]
        const lx = Math.abs(dx * Math.cos(th) - dz * Math.sin(th))
        const lz = Math.abs(dx * Math.sin(th) + dz * Math.cos(th))
        const gap = Math.hypot(Math.max(0, lx - c.scale[0] / 2), Math.max(0, lz - c.scale[2] / 2))
        expect(gap, `${q.geo} ${q.mat}`).toBeGreaterThanOrEqual(q.scale[0] / 2 - 1e-9)
      }
    }
    expect(checked).toBeGreaterThanOrEqual(1) // at least the archive box and its slat are compared
  })

  it('ceiling fixtures: same three parts, tube and housing sample the brushed-steel stripe of metalCabinet, bloom strip unchanged', () => {
    const centres = fixtureCentres()
    expect(centres).toHaveLength(5)
    // The steel window lies inside rows 238..251 of metalCabinet and keeps a one-texel inset.
    expect(FIXTURE_STEEL_UV.v0).toBeGreaterThan(STEEL_PLAIN_V[0])
    expect(FIXTURE_STEEL_UV.v1).toBeLessThan(STEEL_PLAIN_V[1])
    expect(FIXTURE_STEEL_UV.u0).toBeGreaterThan(0)
    expect(FIXTURE_STEEL_UV.u1).toBeLessThan(1)
    for (const [x, z] of centres) {
      const parts = ceilingFixtureParts(x, z)
      expect(parts).toHaveLength(3)
      expect(parts.reduce((n, p) => n + GEOMETRY_TRIANGLES[p.geo], 0)).toBe(26)
      const housing = parts.find((p) => p.mat === 'fixtureHousing')!
      const tube = parts.find((p) => p.mat === 'fluorescent')!
      const bloom = parts.find((p) => p.mat === 'ceilingBloom')!
      for (const p of [housing, tube]) {
        expect(p.atlas!.rect).toEqual(FIXTURE_STEEL_UV)
        expect(p.atlas!.plain).toEqual(FIXTURE_STEEL_UV)
        expect(p.atlas!.faces).toEqual([3]) // the downward face
        const g = atlasBoxGeometry(p.scale[0], p.scale[1], p.scale[2], p.atlas!.rect, p.atlas!.faces, p.atlas!.plain)
        const uv = g.getAttribute('uv')
        for (let i = 0; i < uv.count; i++) {
          expect(uv.getX(i)).toBeGreaterThanOrEqual(FIXTURE_STEEL_UV.u0 - 1e-9)
          expect(uv.getX(i)).toBeLessThanOrEqual(FIXTURE_STEEL_UV.u1 + 1e-9)
          expect(uv.getY(i)).toBeGreaterThanOrEqual(FIXTURE_STEEL_UV.v0 - 1e-9)
          expect(uv.getY(i)).toBeLessThanOrEqual(FIXTURE_STEEL_UV.v1 + 1e-9)
        }
      }
      // End caps: the steel housing extends 5 cm beyond the tube at each end and 4 cm at each side.
      expect((housing.scale[0] - tube.scale[0]) / 2).toBeCloseTo(0.05, 9)
      expect((housing.scale[2] - tube.scale[2]) / 2).toBeCloseTo(0.04, 9)
      expect(bloom.pos[1]).toBeCloseTo(ROOM.height - CEILING_BLOOM_DROP, 9)
      expect(bloom.pos[1]).toBeLessThan(tube.pos[1] - tube.scale[1] / 2)
      expect(bloom.rot).toEqual([Math.PI / 2, 0, 0])
    }
    expect(materials.fluorescent.type).toBe('MeshBasicMaterial')
    expect(materials.fixtureHousing.type).toBe('MeshLambertMaterial')
    setCanvasFactory(null)
    ensureSharedTextures()
    expect(hexOf(materials.fluorescent.color)).toBe('#e8f4ff')
    expect(hexOf(materials.fixtureHousing.color)).toBe('#777c86')
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    const steel = getSharedTexture('metalCabinet')
    expect(materials.fluorescent.map).toBe(steel)
    expect(materials.fixtureHousing.map).toBe(steel)
    expect(hexOf(materials.fluorescent.color)).toBe('#eef6ff')
    expect(materials.ceilingBloom.map).toBe(getSharedTexture('lampGlow'))
    disposeSharedResources()
    expect(hexOf(materials.fluorescent.color)).toBe('#e8f4ff')
    expect(materials.fluorescent.map).toBeNull()
  })

  it('budgets: triangles unchanged at 19,154 (at most the 20,000 cap), 4 lights, 32 textures, 7.703 MiB, every texture and cached geometry disposed once', () => {
    const report = sceneDetailReport()
    expect(report.totalTriangles).toBe(19116 + TASK_30_1_TRIANGLES + TASK_33_1_TRIANGLES + TASK_34_1_TRIANGLES + TASK_35_1_TRIANGLES)
    expect(report.totalTriangles).toBe(19154 + TASK_33_1_TRIANGLES + TASK_34_1_TRIANGLES + TASK_35_1_TRIANGLES)
    expect(report.totalTriangles).toBeLessThanOrEqual(TRIANGLE_CAP)
    expect(M3_LIGHT_COUNT).toBe(4)
    expect(MAX_LIGHTS).toBe(4)
    expect(report.textureCount).toBe(32)
    expect(report.textureMemoryBytes / 1048576).toBeCloseTo(7.703, 3)
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    expect(liveTextureCount()).toBe(32)
    const geos = [
      ...cassettes().map((p) => cassetteBoxGeometry(p.scale[0], p.scale[1], p.scale[2])),
      ...ceilingFixtureParts(0, 0)
        .filter((p) => p.atlas)
        .map((p) => atlasBoxGeometry(p.scale[0], p.scale[1], p.scale[2], p.atlas!.rect, p.atlas!.faces, p.atlas!.plain)),
    ]
    const geoSpies = [...new Set(geos)].map((g) => vi.spyOn(g, 'dispose'))
    const texSpies = TEXTURE_IDS.map((id) => vi.spyOn(getSharedTexture(id)!, 'dispose'))
    disposeSharedResources()
    disposeSharedResources()
    for (const s of [...geoSpies, ...texSpies]) expect(s).toHaveBeenCalledTimes(1)
    expect(liveTextureCount()).toBe(0)
  })
})

// ---------------------------------------------------------------------------------------------
// Task 33.1: record player model, floor-flush bottom face culling and the console cable reclaim
// ---------------------------------------------------------------------------------------------
import { FLOOR_FLUSH_TOLERANCE, OPEN_BOTTOM_SAVED_TRIANGLES, cullFloorBottoms, isFloorFlushBox } from './floorCull'
import {
  TURNTABLE_ARM_ANGLE,
  TURNTABLE_CABINET_TOP,
  TURNTABLE_DECK_Y,
  TURNTABLE_PLATTER_DIAMETER,
  countTriangles,
  partTriangles,
  turntableGroups,
  turntableParts,
  turntableStylusXZ,
} from './modelDetail'
import { TURNTABLE_PLATTER_SEGMENTS, openBottomBoxCount, openBottomBoxGeometry } from './sharedResources'

describe('task 33.1: record player model', () => {
  afterEach(() => setCanvasFactory(null))
  const rp = () => prop('record-player')
  const parts = (playing = false) => turntableParts(rp().box, { playing })
  const extent = (p: Part) => {
    const size: Vec3 = p.geo === 'plane' || p.geo === 'disc' ? [p.scale[0], p.scale[1], 0] : p.scale
    const h = orientedHalfExtents(size, p.rot ?? [0, 0, 0])
    return { minX: p.pos[0] - h[0], maxX: p.pos[0] + h[0], minY: p.pos[1] - h[1], maxY: p.pos[1] + h[1], minZ: p.pos[2] - h[2], maxZ: p.pos[2] + h[2] }
  }
  const hexOf = (c: { getHexString(): string }) => `#${c.getHexString()}`

  it('has every listed part: walnut stand with metric UVs, four rubber feet, plinth, steel deck plate, display, slider, power button, platter, label, spindle and tonearm', () => {
    const all = parts()
    // Walnut cabinet and plinth: woodDark boards with metric UVs.
    const walnut = all.filter((p) => p.mat === 'woodDark')
    expect(walnut.length).toBeGreaterThanOrEqual(7)
    expect(walnut.every((p) => p.geo === 'box' && p.metric === true)).toBe(true)
    // Four small dark rubber feet under the plinth corners.
    const feet = all.filter((p) => p.mat === 'bezel' && p.scale[0] === 0.03 && p.scale[2] === 0.03)
    expect(feet).toHaveLength(4)
    expect(new Set(feet.map((p) => p.pos[1])).size).toBe(1)
    expect(feet[0].pos[1] - feet[0].scale[1] / 2).toBeCloseTo(TURNTABLE_CABINET_TOP, 9)
    // Plinth (woodDark) resting on the feet.
    const plinth = walnut.find((p) => Math.abs(p.scale[1] - 0.05) < 1e-9)!
    expect(plinth).toBeDefined()
    expect(plinth.pos[1] - plinth.scale[1] / 2).toBeCloseTo(feet[0].pos[1] + feet[0].scale[1] / 2, 9)
    // Brushed steel deck plate: the metalCabinet steel stripe window, as used for the fixture housings.
    const deck = all.find((p) => p.mat === 'fixtureHousing')!
    expect(deck.atlas!.rect).toEqual(FIXTURE_STEEL_UV)
    expect(deck.atlas!.plain).toEqual(FIXTURE_STEEL_UV)
    expect(deck.atlas!.faces).toEqual([2])
    expect(deck.pos[1] + deck.scale[1] / 2).toBeCloseTo(TURNTABLE_DECK_Y, 9)
    expect(deck.pos[1] - deck.scale[1] / 2).toBeCloseTo(plinth.pos[1] + plinth.scale[1] / 2, 9)
    // Emissive track indicator (amber when idle), pitch slider (silver knob in a slot) and the round power button.
    expect(all.filter((p) => p.mat === 'trackDisplay')).toHaveLength(1)
    expect(all.filter((p) => p.mat === 'trackDisplayOn')).toHaveLength(0)
    expect(all.some((p) => p.mat === 'labelSlot' && p.geo === 'box')).toBe(true)
    expect(all.some((p) => p.mat === 'bezel' && p.scale[0] === 0.012 && p.scale[2] === 0.1)).toBe(true)
    const button = all.find((p) => p.mat === 'metal' && p.geo === 'cylinderLow' && p.scale[0] === 0.026)!
    expect(button).toBeDefined()
    // Platter: a 24-segment 0.30 m vinyl, a thin coloured label disc and a spindle, all in the platter group.
    const platter = all.filter((p) => p.turntableGroup === 'platter')
    expect(platter.map((p) => p.geo).sort()).toEqual(['cylinderLow', 'disc', 'platter'])
    const vinyl = platter.find((p) => p.geo === 'platter')!
    expect(vinyl.mat).toBe('vinyl')
    expect(vinyl.scale[0]).toBeCloseTo(TURNTABLE_PLATTER_DIAMETER, 9)
    expect(vinyl.scale[2]).toBeCloseTo(TURNTABLE_PLATTER_DIAMETER, 9)
    expect(platter.find((p) => p.geo === 'disc')!.mat).toBe('recordLabel')
    expect(platter.find((p) => p.geo === 'cylinderLow')!.scale[1]).toBeGreaterThan(0.01)
    // Angled metallic tonearm: post, tube, rear stub, counterweight, headshell and cartridge.
    const arm = all.filter((p) => p.turntableGroup === 'tonearm')
    expect(arm).toHaveLength(6)
    expect(arm.filter((p) => p.mat === 'tapeSlotMetal').length).toBeGreaterThanOrEqual(4)
    expect(arm.some((p) => p.rot && Math.abs(p.rot[1]) > 0.1)).toBe(true)
    expect(all.every((p) => p.turntableGroup !== undefined)).toBe(true)
  })

  it('platter geometry: a shared cylinder of diameter 1 with 24 radial segments, so the 0.30 m disc is 0.30 m wide and 96 triangles', () => {
    expect(TURNTABLE_PLATTER_SEGMENTS).toBeGreaterThanOrEqual(24)
    expect(geometries.platter.parameters.radialSegments).toBeGreaterThanOrEqual(24)
    expect(geometries.platter.parameters.radiusTop * 2).toBeCloseTo(1, 9)
    expect(geometries.platter.parameters.radiusTop * 2 * TURNTABLE_PLATTER_DIAMETER).toBeCloseTo(0.3, 9)
    expect(GEOMETRY_TRIANGLES.platter).toBe(96)
    // Scaled by the part, the vinyl is 0.30 m across.
    const vinyl = parts().find((p) => p.geo === 'platter')!
    geometries.platter.computeBoundingBox()
    const box = geometries.platter.boundingBox!
    expect((box.max.x - box.min.x) * vinyl.scale[0]).toBeCloseTo(0.3, 9)
    expect((box.max.z - box.min.z) * vinyl.scale[2]).toBeCloseTo(0.3, 9)
  })

  it('exposes the platter and the tonearm as separate groups: the platter is local to the spindle axis, so a group at the spindle can spin it', () => {
    const g = turntableGroups(rp().box, { playing: false })
    expect(g.static.every((p) => p.turntableGroup === 'static')).toBe(true)
    expect(g.platter.every((p) => p.turntableGroup === 'platter')).toBe(true)
    expect(g.tonearm.every((p) => p.turntableGroup === 'tonearm')).toBe(true)
    for (const p of g.platter) {
      expect(p.pos[0]).toBe(0)
      expect(p.pos[2]).toBe(0)
    }
    expect(g.spindle[1]).toBeCloseTo(TURNTABLE_DECK_Y, 9)
    // The vinyl rests on the deck plate: its bottom is at the spindle height.
    const vinyl = g.platter.find((p) => p.geo === 'platter')!
    expect(g.spindle[1] + vinyl.pos[1] - vinyl.scale[1] / 2).toBeCloseTo(TURNTABLE_DECK_Y, 9)
    // Merged world parts equal static + shifted platter + tonearm.
    expect(parts()).toHaveLength(g.static.length + g.platter.length + g.tonearm.length)
    const merged = parts().filter((p) => p.turntableGroup === 'platter')
    expect(merged.every((p, i) => Math.abs(p.pos[0] - (g.platter[i].pos[0] + g.spindle[0])) < 1e-12)).toBe(true)
    // Rotating the platter group about y never leaves the footprint: the vinyl is a circle of radius 0.15 about the spindle.
    const b = rp().box
    expect(g.spindle[0] - 0.15).toBeGreaterThan(b.minX)
    expect(g.spindle[0] + 0.15).toBeLessThan(b.maxX)
    expect(g.spindle[2] - 0.15).toBeGreaterThan(b.minZ)
    expect(g.spindle[2] + 0.15).toBeLessThan(b.maxZ)
  })

  it('the tonearm has a stopped pose on its cradle and a playing pose on the record groove, and both stay inside the footprint', () => {
    const b = rp().box
    const g = turntableGroups(b, { playing: false })
    expect(TURNTABLE_ARM_ANGLE.stopped).not.toBe(TURNTABLE_ARM_ANGLE.playing)
    const stopped = turntableGroups(b, { playing: false }).tonearm
    const playing = turntableGroups(b, { playing: true }).tonearm
    expect(stopped).toHaveLength(playing.length)
    expect(stopped.map((p) => p.pos)).not.toEqual(playing.map((p) => p.pos))
    // Same arm, same heights: only the yaw about the pivot post changes.
    expect(stopped.map((p) => p.pos[1])).toEqual(playing.map((p) => p.pos[1]))
    expect(stopped.map((p) => p.geo)).toEqual(playing.map((p) => p.geo))
    for (const pose of [stopped, playing]) {
      for (const p of pose) {
        const e = extent(p)
        expect(e.minX, p.mat).toBeGreaterThanOrEqual(b.minX)
        expect(e.maxX, p.mat).toBeLessThanOrEqual(b.maxX)
        expect(e.minZ, p.mat).toBeGreaterThanOrEqual(b.minZ)
        expect(e.maxZ, p.mat).toBeLessThanOrEqual(b.maxZ)
        expect(e.minY, p.mat).toBeGreaterThanOrEqual(TURNTABLE_DECK_Y - 1e-9)
        expect(e.maxY, p.mat).toBeLessThanOrEqual(rp().height)
      }
    }
    // Stopped: the stylus is outside the 0.15 m record and the tube rests on the cradle (a static part). Playing: the stylus is on the groove.
    const [sx, sz] = g.spindle.filter((_, i) => i !== 1) as [number, number]
    const rStopped = Math.hypot(turntableStylusXZ(b, { playing: false })[0] - sx, turntableStylusXZ(b, { playing: false })[1] - sz)
    const rPlaying = Math.hypot(turntableStylusXZ(b, { playing: true })[0] - sx, turntableStylusXZ(b, { playing: true })[1] - sz)
    expect(rStopped).toBeGreaterThan(TURNTABLE_PLATTER_DIAMETER / 2)
    expect(rPlaying).toBeLessThan(TURNTABLE_PLATTER_DIAMETER / 2)
    expect(rPlaying).toBeGreaterThan(0.05) // outside the centre label (0.10 m across)
    const tube = (pose: Part[]) => pose.find((p) => p.mat === 'tapeSlotMetal' && p.scale[0] > 0.2)!
    const cradle = g.static.find((p) => p.mat === 'metal' && p.scale[0] === 0.014)!
    const t = tube(stopped)
    // The cradle top touches the tube underside, and the tube end is above it (within the cradle width).
    expect(cradle.pos[1] + cradle.scale[1] / 2).toBeCloseTo(t.pos[1] - t.scale[1] / 2, 9)
    const endX = t.pos[0] + (t.scale[0] / 2) * Math.cos(TURNTABLE_ARM_ANGLE.stopped)
    const endZ = t.pos[2] + (t.scale[0] / 2) * Math.sin(TURNTABLE_ARM_ANGLE.stopped)
    expect(Math.hypot(endX - cradle.pos[0], endZ - cradle.pos[2])).toBeLessThan(0.01)
    // The cartridge touches the record top in the playing pose and hangs above the deck in the stopped pose.
    const recordTop = g.spindle[1] + g.platter.find((p) => p.geo === 'platter')!.scale[1]
    const cartridge = (pose: Part[]) => pose.find((p) => p.mat === 'bezel')!
    expect(cartridge(playing).pos[1] - cartridge(playing).scale[1] / 2).toBeCloseTo(recordTop, 9)
    expect(cartridge(stopped).pos[1] - cartridge(stopped).scale[1] / 2).toBeGreaterThan(TURNTABLE_DECK_Y)
    // The display changes tone only, not the part count.
    expect(parts(true).filter((p) => p.mat === 'trackDisplayOn')).toHaveLength(1)
    expect(parts(true)).toHaveLength(parts(false).length)
  })

  it('everything stays inside the console footprint, above the floor, below the prop height and rests on the console top without overlap of stacked boards', () => {
    const b = rp().box
    for (const pose of [false, true]) {
      for (const p of parts(pose)) {
        const e = extent(p)
        const where = `${p.mat} ${p.geo} at ${p.pos.map((v) => v.toFixed(3)).join(',')}`
        expect(e.minX, where).toBeGreaterThanOrEqual(b.minX - 1e-9)
        expect(e.maxX, where).toBeLessThanOrEqual(b.maxX + 1e-9)
        expect(e.minZ, where).toBeGreaterThanOrEqual(b.minZ - 1e-9)
        expect(e.maxZ, where).toBeLessThanOrEqual(b.maxZ + 1e-9)
        expect(e.minY, where).toBeGreaterThanOrEqual(-1e-9)
        expect(e.maxY, where).toBeLessThanOrEqual(rp().height + 1e-9)
      }
    }
    // The top slab (0.04 thick, top at 0.62) carries the feet; the slab spans the whole footprint.
    const slab = parts().find((p) => p.mat === 'woodDark' && Math.abs(p.scale[1] - 0.04) < 1e-9 && Math.abs(p.scale[0] - (b.maxX - b.minX)) < 1e-6)!
    expect(slab.pos[1] + slab.scale[1] / 2).toBeCloseTo(TURNTABLE_CABINET_TOP, 9)
    expect(slab.scale[2]).toBeCloseTo(b.maxZ - b.minZ, 9)
  })

  it('costs exactly 526 triangles: static 282, platter group 152, tonearm 92 (the floor-flush kick plinth loses its bottom face)', () => {
    const g = turntableGroups(rp().box)
    expect(countTriangles(g.static)).toBe(282)
    expect(countTriangles(g.platter)).toBe(152)
    expect(countTriangles(g.tonearm)).toBe(92)
    expect(countTriangles(parts())).toBe(TASK_33_1_TURNTABLE)
    expect(countTriangles(parts(true))).toBe(TASK_33_1_TURNTABLE)
    // Task 35.1: the declared record-player object is the two-tier console now (the 526-triangle console is still what turntableParts builds).
    const obj = sceneDetailReport().objects.find((o) => o.name === 'record-player')!
    expect(obj.triangles).toBe(TASK_35_1_CONSOLE)
    // The kick plinth is the one open-bottom board of the console.
    expect(parts().filter((p) => p.openBottom)).toHaveLength(1)
  })

  it('the display is an emissive MeshBasicMaterial (amber idle, emerald playing) and the player adds no light and no texture', () => {
    expect(materials.trackDisplay.type).toBe('MeshBasicMaterial')
    expect(materials.trackDisplayOn.type).toBe('MeshBasicMaterial')
    expect(hexOf(materials.trackDisplay.color)).toBe('#ffb347')
    expect(hexOf(materials.trackDisplayOn.color)).toBe('#3ddc97')
    for (const key of ['vinyl', 'recordLabel', 'trackDisplay', 'trackDisplayOn'] as const) expect(materials[key].map).toBeNull()
    expect(M3_LIGHT_COUNT).toBe(4)
    expect(MAX_LIGHTS).toBe(4)
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    // Only the existing 32 textures: the new materials stay flat colours, and the report has the same texture memory as before 33.1.
    expect(liveTextureCount()).toBe(32)
    for (const key of ['vinyl', 'recordLabel', 'trackDisplay', 'trackDisplayOn'] as const) expect(materials[key].map).toBeNull()
    expect(materials.fixtureHousing.map).toBe(getSharedTexture('metalCabinet'))
    expect(materials.woodDark.map).toBe(getSharedTexture('woodDark'))
    const report = sceneDetailReport()
    expect(report.textureCount).toBe(32)
    expect(report.textureMemoryBytes / 1048576).toBeCloseTo(7.703, 3)
    const used = new Set(parts().map((p) => p.mat))
    for (const key of used) expect(materials[key], key).toBeDefined()
  })

  it('every new geometry is cached and disposed exactly once (open-bottom boxes, the metric boards under them and the platter per disposal call)', () => {
    const open = parts().filter((p) => p.openBottom)
    expect(open.length).toBeGreaterThan(0)
    const bases = open.map((p) => woodBoxGeometry(p.scale[0], p.scale[1], p.scale[2]))
    const variants = bases.map((g) => openBottomBoxGeometry(g))
    // Cached: the same source gives the same variant; a second request creates nothing new.
    bases.forEach((g, i) => expect(openBottomBoxGeometry(g)).toBe(variants[i]))
    expect(openBottomBoxCount()).toBeGreaterThanOrEqual(new Set(variants).size)
    const unit = openBottomBoxGeometry(geometries.box)
    expect(openBottomBoxGeometry(geometries.box)).toBe(unit)
    const spies = [...new Set([...variants, unit, ...bases])].map((g) => vi.spyOn(g, 'dispose'))
    const platterSpy = vi.spyOn(geometries.platter, 'dispose')
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(platterSpy).toHaveBeenCalledTimes(1)
    disposeSharedResources()
    // Twice-safe: the caches were cleared on the first call, so none of the cached geometries is disposed again.
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(openBottomBoxCount()).toBe(0)
    expect(woodBoxCount()).toBe(0)
  })
})

describe('task 33.1: floor-flush bottom face culling', () => {
  afterEach(() => setCanvasFactory(null))
  const culledNames = [
    'media-console',
    'filing-cabinet-a',
    'filing-cabinet-b',
    'archive-boxes-nw',
    'archive-boxes-ne',
    'archive-boxes-sw',
    'arcade-snake',
    'arcade-maze',
    'arcade-frequency',
    'crt-stack',
    'desk',
    'record-player',
    'loudspeaker',
    'crate-a',
    'crate-b',
    'shelf-a',
    'shelf-b',
    'shelf-c',
  ]

  it('the open-bottom geometry has no -Y face: 10 triangles, none of them facing down, other faces and UVs unchanged', () => {
    const g = woodBoxGeometry(0.8, 0.6, 0.4)
    const open = openBottomBoxGeometry(g)
    expect(open).not.toBe(g)
    expect(g.getIndex()!.count / 3).toBe(12)
    expect(open.getIndex()!.count / 3).toBe(GEOMETRY_TRIANGLES.box - OPEN_BOTTOM_SAVED_TRIANGLES)
    const normal = open.getAttribute('normal')
    const index = open.getIndex()!
    for (let i = 0; i < index.count; i++) expect(normal.getY(index.getX(i))).toBeGreaterThan(-0.5)
    // The five remaining faces are exactly the source faces: the same triangles, with the same UV rows.
    const faceOf = (idx: number) => Math.floor(idx / 4)
    const used = new Set(Array.from(index.array).map(faceOf))
    expect([...used].sort()).toEqual([0, 1, 2, 4, 5])
    expect(open.getAttribute('uv').array).toEqual(g.getAttribute('uv').array)
    expect(open.getAttribute('position').array).toEqual(g.getAttribute('position').array)
    // The unit box variant (plain parts) loses its bottom face too.
    const unit = openBottomBoxGeometry(geometries.box)
    expect(unit.getIndex()!.count / 3).toBe(10)
    expect(geometries.box.getIndex()!.count / 3).toBe(12)
    expect(() => openBottomBoxGeometry(geometries.plane)).toThrow()
  })

  it('only floor-flush boxes carry openBottom: bottom at y = 0 within 1 mm, no tilt, and every such box of the culled objects has it', () => {
    let flagged = 0
    for (const o of declaredObjects()) {
      for (const p of o.parts) {
        if (p.openBottom) {
          flagged++
          expect(p.geo, o.name).toBe('box')
          expect(Math.abs(p.pos[1] - p.scale[1] / 2), `${o.name} ${p.mat}`).toBeLessThanOrEqual(FLOOR_FLUSH_TOLERANCE)
          expect(Math.abs(p.rot?.[0] ?? 0) + Math.abs(p.rot?.[2] ?? 0), o.name).toBe(0)
          expect(partTriangles(p)).toBe(GEOMETRY_TRIANGLES.box - removedFaces(p).length * CULLED_FACE_SAVED_TRIANGLES)
        } else if (culledNames.includes(o.name)) {
          // No floor-flush box is left uncut in the objects the pass covers.
          expect(isFloorFlushBox(p), `${o.name} ${p.mat} at ${p.pos.join(',')}`).toBe(false)
        }
      }
    }
    // 34 boxes of the existing models, the four steel console posts (35.1) and the loudspeaker cabinet (35.1).
    expect(flagged).toBe(39)
    const savedExisting = declaredObjects()
      .filter((o) => o.name !== 'record-player' && o.name !== 'loudspeaker')
      .reduce((n, o) => n + o.parts.filter((p) => p.openBottom).length * OPEN_BOTTOM_SAVED_TRIANGLES, 0)
    expect(savedExisting).toBe(-TASK_33_1_CULLED_EXISTING)
  })

  it('cullFloorBottoms flags only unrotated or yaw-rotated boxes on the floor, leaves other parts untouched and is idempotent', () => {
    const box = (pos: Vec3, scale: Vec3, rot?: Vec3): Part => ({ geo: 'box', mat: 'wood', pos, scale, ...(rot ? { rot } : {}) })
    const onFloor = box([0, 0.2, 0], [1, 0.4, 1])
    const yawed = box([0, 0.2, 0], [1, 0.4, 1], [0, 0.5, 0])
    const tilted = box([0, 0.2, 0], [1, 0.4, 1], [0.3, 0, 0])
    const raised = box([0, 0.5, 0], [1, 0.4, 1])
    const almost = box([0, 0.2005, 0], [1, 0.4, 1])
    const cylinder: Part = { geo: 'cylinderLow', mat: 'wood', pos: [0, 0.2, 0], scale: [1, 0.4, 1] }
    const out = cullFloorBottoms([onFloor, yawed, tilted, raised, almost, cylinder])
    expect(out.map((p) => Boolean(p.openBottom))).toEqual([true, true, false, false, true, false])
    expect(out[3]).toBe(raised)
    expect(out[5]).toBe(cylinder)
    expect(cullFloorBottoms(out).map((p) => Boolean(p.openBottom))).toEqual([true, true, false, false, true, false])
    expect(onFloor.openBottom).toBeUndefined()
    // Draw-call groups separate the open variant from the closed one, and the saving is two triangles per box.
    expect(partGroupKey(out[0])).not.toBe(partGroupKey(onFloor))
    expect(partTriangles(out[0])).toBe(10)
    expect(partTriangles(onFloor)).toBe(12)
  })
})

describe('task 33.1: console cable reclaim and budgets', () => {
  const crt = () => prop('crt-vhs')

  it('the console cables keep the smoothed top run and draw the three back-panel runs along their raw control points (19 segments, was 34)', () => {
    const cables = consoleCableParts(crt().box)
    expect(cables).toHaveLength(19)
    expect(cables.every((p) => p.geo === 'cylinderLow')).toBe(true)
    expect(cables.filter((p) => p.mat === 'cableGrey')).toHaveLength(7)
    expect(cables.filter((p) => p.mat === 'cableRed')).toHaveLength(4)
    expect(cables.filter((p) => p.mat === 'cableBlack')).toHaveLength(8)
    expect(countTriangles(cables)).toBe(19 * GEOMETRY_TRIANGLES.cylinderLow)
    expect(34 * GEOMETRY_TRIANGLES.cylinderLow - countTriangles(cables)).toBe(-TASK_33_1_CABLES)
    // The default of cablePathParts is still the smoothed path.
    expect(cablePathParts([[0, 1, 0], [1, 1, 0], [1, 0, 0]], 'cableBlack', 0.02)).toHaveLength(5)
    expect(cablePathParts([[0, 1, 0], [1, 1, 0], [1, 0, 0]], 'cableBlack', 0.02, false)).toHaveLength(2)
    const report = sceneDetailReport()
    expect(report.objects.find((o) => o.name === 'console-cables')!.triangles).toBe(608)
  })

  it('totals: 19,988 triangles (33.1 net -22 from 19,154, 34.1 net +64, 35.1 net +792), at most 20,000, 4 lights, 32 textures, 7.703 MiB, record player present', () => {
    const report = sceneDetailReport()
    expect(TASK_33_1_TRIANGLES).toBe(-22)
    expect(TASK_34_1_TRIANGLES).toBe(64)
    expect(report.totalTriangles).toBe(19154 + TASK_33_1_TRIANGLES + TASK_34_1_TRIANGLES + TASK_35_1_TRIANGLES)
    expect(report.totalTriangles).toBe(19988)
    expect(report.totalTriangles).toBeLessThanOrEqual(TRIANGLE_CAP)
    expect(report.totalTriangles).toBeLessThan(SCENE_TRIANGLE_BUDGET)
    expect(report.objects.map((o) => o.name)).toContain('record-player')
    expect(M3_LIGHT_COUNT).toBe(4)
    expect(report.textureCount).toBe(32)
    expect(report.textureMemoryBytes / 1048576).toBeCloseTo(7.703, 3)
    expect(report.totalDrawCalls).toBeLessThan(DRAW_CALL_CAP)
  })

  it('the record player is a solid console with a world interactable, not a Station', () => {
    expect(COLLIDERS).toContain(prop('record-player').box)
    expect(INTERACTABLE_DEFS.find((d) => d.id === 'record-player')!.kind).toBe('turntable')
    expect(STATION_DEFS.some((s) => (s.id as string) === 'record-player')).toBe(false)
  })
})

// ---------------------------------------------------------------------------------------------
// Task 33.3: platter spin rate, tonearm pose and display material follow `playing`
// ---------------------------------------------------------------------------------------------
import { TURNTABLE_RPM, TURNTABLE_SPIN_RAD_PER_SEC, advancePlatterAngle } from './modelDetail'

describe('task 33.3: turntable spin and pose', () => {
  const box = () => prop('record-player').box
  const propsSource = Object.values(
    import.meta.glob('./Props.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
  )[0]

  it('spins at 33 1/3 RPM (about 3.49 rad/s)', () => {
    expect(TURNTABLE_RPM).toBeCloseTo(33.3333, 4)
    expect(TURNTABLE_SPIN_RAD_PER_SEC).toBeCloseTo((100 / 3) * (Math.PI / 30), 9)
    expect(TURNTABLE_SPIN_RAD_PER_SEC).toBeCloseTo(3.4907, 3)
    // One second of playing advances the angle by exactly that rate; 1.8 s is one full turn (60 / 33.33).
    expect(advancePlatterAngle(0, 0.05, true, false)).toBeCloseTo(TURNTABLE_SPIN_RAD_PER_SEC * 0.05, 9)
  })

  it('does not advance while stopped, under reduced motion or for a non-positive dt; a long stall is clamped', () => {
    expect(advancePlatterAngle(1, 0.016, false, false)).toBe(1)
    expect(advancePlatterAngle(1, 0.016, true, true)).toBe(1)
    expect(advancePlatterAngle(1, 0, true, false)).toBe(1)
    expect(advancePlatterAngle(1, -1, true, false)).toBe(1)
    expect(advancePlatterAngle(0, 5, true, false)).toBeCloseTo(TURNTABLE_SPIN_RAD_PER_SEC * 0.1, 9)
    expect(advancePlatterAngle(6.2, 0.1, true, false)).toBeLessThan(2 * Math.PI)
  })

  it('the tonearm moves from the cradle pose to the record pose and the display switches from amber to emerald with `playing`', () => {
    const stopped = turntableGroups(box(), { playing: false })
    const playing = turntableGroups(box(), { playing: true })
    expect(turntableStylusXZ(box(), { playing: false })).not.toEqual(turntableStylusXZ(box(), { playing: true }))
    expect(TURNTABLE_ARM_ANGLE.playing).not.toBe(TURNTABLE_ARM_ANGLE.stopped)
    expect(stopped.static.some((p) => p.mat === 'trackDisplay')).toBe(true)
    expect(stopped.static.some((p) => p.mat === 'trackDisplayOn')).toBe(false)
    expect(playing.static.some((p) => p.mat === 'trackDisplayOn')).toBe(true)
    expect(playing.static.some((p) => p.mat === 'trackDisplay')).toBe(false)
    expect(stopped.tonearm).not.toEqual(playing.tonearm)
  })

  it('Props passes the playing flag to RecordPlayer, which spins the platter in useFrame and honours reduced motion', () => {
    expect(propsSource).toContain('turntablePlaying')
    expect(propsSource).toMatch(/<RecordPlayer[^>]*playing=\{turntablePlaying\}/)
    expect(propsSource).toContain('advancePlatterAngle(g.rotation.y, dt, playing, reduced)')
    expect(propsSource).toContain('useReducedMotion()')
  })
})

// ---------------------------------------------------------------------------------------------
// Task 34.1: Hi-Fi listening table, wall-flush face culling and the triangle / draw-call budget
// ---------------------------------------------------------------------------------------------
import { BOX_FACES, CULLED_FACE_SAVED_TRIANGLES, WALL_FLUSH_TOLERANCE, removedFaces, wallFlushFaces } from './floorCull'
import {
  HIFI_CASSETTE,
  HIFI_FRAME,
  HIFI_GLOW_LIFT,
  HIFI_JACKET,
  HIFI_LID,
  HIFI_RACK,
  HIFI_RECEIVER,
  HIFI_RECORD_CRATE,
  HIFI_RECORD_PALETTE,
  HIFI_SLEEVE_MATERIALS,
  HIFI_TABLE_D,
  HIFI_TABLE_W,
  HIFI_TURNTABLE_SECTION_W,
  NOW_PLAYING_COLOURS,
  NOW_PLAYING_NEUTRAL,
  countDrawCalls,
  hifiRecordColours,
  hifiTableGroups,
  hifiTableParts,
  hifiTablePlacement,
  isRealSizePart,
  nowPlayingColour,
  nowPlayingMaterial,
  propBackAgainstWall,
  speakerParts,
  speakerPlacement,
  type HifiRole,
} from './modelDetail'
import { HIFI_GLOW_OPACITY, culledBoxGeometry } from './sharedResources'
import { AdditiveBlending, DoubleSide } from 'three'

describe('task 35.1: two-tier Hi-Fi console', () => {
  afterEach(() => setCanvasFactory(null))
  const placement = () => hifiTablePlacement()
  const parts = (playing = false, track = 4) => hifiTableParts(placement().local, { playing, track }, placement().wallBack)
  const groups = (playing = false, track = 4) => hifiTableGroups(placement().local, { playing, track }, placement().wallBack)
  const role = (all: readonly Part[], r: HifiRole) => all.filter((p) => p.hifiRole === r)
  const extent = (p: Part) => {
    const size: Vec3 = p.geo === 'plane' || p.geo === 'disc' ? [p.scale[0], p.scale[1], 0] : p.scale
    const h = orientedHalfExtents(size, p.rot ?? [0, 0, 0])
    return { minX: p.pos[0] - h[0], maxX: p.pos[0] + h[0], minY: p.pos[1] - h[1], maxY: p.pos[1] + h[1], minZ: p.pos[2] - h[2], maxZ: p.pos[2] + h[2] }
  }
  const hexOf = (c: { getHexString(): string }) => `#${c.getHexString()}`
  const luminance = (c: { r: number; g: number; b: number }) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
  const TOP = TURNTABLE_CABINET_TOP
  const SHELF = HIFI_FRAME.shelfTop
  const SLAB_BOTTOM = TOP - HIFI_FRAME.slabT
  const obbOf = (p: Part): OBB => {
    const rot = p.rot ?? [0, 0, 0]
    const m = new Matrix4().makeRotationFromEuler(new Euler(rot[0], rot[1], rot[2]))
    return new OBB(new Vector3(p.pos[0], p.pos[1], p.pos[2]), new Vector3(p.scale[0] / 2, p.scale[1] / 2, p.scale[2] / 2), new Matrix3().setFromMatrix4(m))
  }

  it('is the record-player prop on the south wall: local footprint 1.25 x 0.45 m, front toward +z in its local frame, back on the wall plane', () => {
    const pl = placement()
    expect(pl.prop.id).toBe('record-player')
    expect(pl.prop.facing).toBe('-z')
    expect(pl.wallBack).toBe(true)
    expect(pl.local.maxX - pl.local.minX).toBeCloseTo(HIFI_TABLE_W, 9)
    expect(pl.local.maxZ - pl.local.minZ).toBeCloseTo(HIFI_TABLE_D, 9)
    expect(HIFI_TABLE_W).toBe(1.25)
    expect(HIFI_TABLE_D).toBe(0.45)
    expect(pl.frame.rotationY).toBeCloseTo(Math.PI, 9)
    expect(propBackAgainstWall('record-player')).toBe(true)
    expect(propBackAgainstWall('loudspeaker')).toBe(true)
    expect(propBackAgainstWall('filing-cabinet-a')).toBe(true)
    expect(propBackAgainstWall('reception-desk')).toBe(false)
    expect(propBackAgainstWall('couch')).toBe(false)
  })

  it('has every part group of the two tiers with the declared counts, and the turntable assembly unchanged on the left 0.8 m (same platter group and tonearm in both poses)', () => {
    const local = placement().local
    const ttBox = { minX: local.minX + 0.025, maxX: local.minX + 0.025 + HIFI_TURNTABLE_SECTION_W, minZ: local.minZ, maxZ: local.maxZ }
    expect(HIFI_TURNTABLE_SECTION_W).toBe(0.8)
    for (const playing of [false, true]) {
      const g = groups(playing)
      const legacy = turntableGroups(ttBox, { playing })
      expect(g.platter).toEqual(legacy.platter)
      expect(g.tonearm).toEqual(legacy.tonearm)
      expect(g.spindle).toEqual(legacy.spindle)
      expect(g.pivot).toEqual(legacy.pivot)
      for (const key of ['bezel', 'fixtureHousing', 'labelSlot', playing ? 'trackDisplayOn' : 'trackDisplay'] as const) {
        expect(g.static.some((p) => p.mat === key), key).toBe(true)
      }
      expect(g.static.filter((p) => p.mat === 'bezel' && p.scale[0] === 0.03 && p.scale[2] === 0.03)).toHaveLength(4)
      expect(g.platter.map((p) => p.geo).sort()).toEqual(['cylinderLow', 'disc', 'platter'])
      expect(g.tonearm).toHaveLength(6)
      // The pitch slider and power button stay on the narrower deck (0.35 m half width).
      const deck = g.static.find((p) => p.mat === 'fixtureHousing' && p.atlas && p.scale[1] === 0.004)!
      for (const p of g.static.filter((q) => q.mat === 'labelSlot' || (q.mat === 'metal' && q.geo === 'cylinderLow'))) {
        expect(Math.abs(p.pos[0] - deck.pos[0]) + p.scale[0] / 2, p.mat).toBeLessThanOrEqual(deck.scale[0] / 2 + 1e-9)
      }
    }
    const all = parts()
    const counts: Record<string, number> = {}
    for (const p of all) if (p.hifiRole) counts[p.hifiRole] = (counts[p.hifiRole] ?? 0) + 1
    expect(counts).toEqual({
      frame: 7, // four steel posts, walnut top slab, walnut lower shelf, steel shelf lip
      led: 1,
      cover: 6, // four acrylic panels and two hinge brackets
      stand: 2,
      jacket: 1,
      cassette: 2,
      lamp: 4,
      rack: 6,
      rackSleeve: 12,
      stack: 2,
      receiver: 4,
      receiverDial: 3,
      receiverDisplay: 1,
      crate: 4,
      record: 10,
      recordLabel: 10,
      glow: 1,
    })
    // Frame: four steel (metalCabinet stripe) corner posts, walnut metric boards for the slab and shelf.
    const frame = role(all, 'frame')
    expect(frame.filter((p) => p.mat === 'fixtureHousing' && p.atlas)).toHaveLength(5)
    expect(frame.filter((p) => p.mat === 'woodDark' && p.metric === true)).toHaveLength(2)
    const posts = frame.filter((p) => p.scale[0] === HIFI_FRAME.post && p.scale[2] === HIFI_FRAME.post)
    expect(posts).toHaveLength(4)
    for (const p of posts) {
      expect(extent(p).minY).toBeCloseTo(0, 9)
      expect(extent(p).maxY).toBeCloseTo(SLAB_BOTTOM, 9)
      expect(p.openBottom).toBe(true)
    }
    // The top slab carries the top at 0.62 m, the shelf its surface at 0.10 m.
    const slab = frame.find((p) => p.mat === 'woodDark' && p.scale[1] === HIFI_FRAME.slabT)!
    const shelf = frame.find((p) => p.mat === 'woodDark' && p.scale[1] === HIFI_FRAME.shelfT)!
    expect(extent(slab).maxY).toBeCloseTo(TOP, 9)
    expect(extent(shelf).maxY).toBeCloseTo(SHELF, 9)
    expect(SHELF).toBeLessThan(SLAB_BOTTOM)
  })

  it('the open dust cover is a clear acrylic lid (transparent #b9d4ff at 0.18, no depth write), propped open at 60 degrees, and never touches the tonearm in either pose', () => {
    const cover = role(parts(), 'cover')
    const panels = cover.filter((p) => p.mat === 'hifiDustCover')
    expect(panels).toHaveLength(4)
    expect(cover.filter((p) => p.mat === 'metal')).toHaveLength(2)
    const m = materials.hifiDustCover
    expect(m.type).toBe('MeshLambertMaterial')
    expect(m.transparent).toBe(true)
    expect(m.opacity).toBeCloseTo(0.18, 9)
    expect(m.depthWrite).toBe(false)
    expect(m.map).toBeNull()
    expect(hexOf(m.color)).toBe('#b9d4ff')
    expect(m.color.b).toBeGreaterThan(m.color.r)
    expect(m.color.b).toBeGreaterThanOrEqual(m.color.g)
    // Open: every panel is tilted about x by -60 degrees (front edge raised), within the 60..70 degree range.
    const deg = (HIFI_LID.open * 180) / Math.PI
    expect(deg).toBeGreaterThanOrEqual(60 - 1e-9)
    expect(deg).toBeLessThanOrEqual(70)
    for (const p of panels) {
      expect(p.geo).toBe('box')
      expect(p.rot![0]).toBeCloseTo(-HIFI_LID.open, 9)
    }
    const lidTop = panels.find((p) => p.scale[1] === HIFI_LID.t && p.scale[2] === HIFI_LID.length)!
    const rise = (HIFI_LID.length / 2) * Math.sin(HIFI_LID.open)
    expect(lidTop.pos[1] + rise).toBeGreaterThan(lidTop.pos[1] - rise + 0.2)
    // Hinged at the back: the lowest edge of the side panels is at the hinge height on the plinth top, behind the platter.
    const hingeY = TOP + 0.012 + 0.05
    const sides = panels.filter((p) => p.scale[0] === HIFI_LID.t)
    expect(sides).toHaveLength(2)
    expect(Math.min(...sides.map((p) => extent(p).minY))).toBeGreaterThanOrEqual(hingeY - 0.1 * Math.cos(HIFI_LID.open) - 1e-6)
    // No clipping with the tonearm (tube, counterweight, headshell, cartridge, pivot post) in the stopped or the playing pose, with 2 mm to spare.
    for (const playing of [false, true]) {
      const lid = role(parts(playing), 'cover').filter((p) => p.mat === 'hifiDustCover').map(obbOf)
      for (const arm of groups(playing).tonearm) {
        const a = obbOf(arm)
        for (const l of lid) expect(l.intersectsOBB(a, 0.002), `${arm.mat} ${arm.geo} playing=${playing}`).toBe(false)
      }
    }
    // The whole open lid stays below the prop height.
    for (const p of cover) expect(extent(p).maxY).toBeLessThanOrEqual(placement().prop.height + 1e-9)
  })

  it('nowPlayingColour: tracks 0..3 are the four colours and STOP (4), nothing yet and any other value are the neutral dark grey', () => {
    expect([0, 1, 2, 3].map((t) => nowPlayingColour(t))).toEqual(['#16a34a', '#e11d48', '#38bdf8', '#f59e0b'])
    expect(nowPlayingColour(4)).toBe(NOW_PLAYING_NEUTRAL)
    expect(NOW_PLAYING_NEUTRAL).toBe('#3a3d46')
    for (const t of [-1, 5, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 99]) expect(nowPlayingColour(t), String(t)).toBe(NOW_PLAYING_NEUTRAL)
    expect(new Set([...NOW_PLAYING_COLOURS, NOW_PLAYING_NEUTRAL]).size).toBe(5)
    for (const t of [0, 1, 2, 3, 4]) expect(hexOf(materials[nowPlayingMaterial(t)].color)).toBe(nowPlayingColour(t))
    for (const m of HIFI_SLEEVE_MATERIALS) {
      expect(materials[m].type).toBe('MeshLambertMaterial')
      expect(materials[m].map).toBeNull()
    }
    expect(nowPlayingMaterial(0)).toBe('sleeveGreen')
    expect(nowPlayingMaterial(4)).toBe('sleeveNeutral')
    expect(nowPlayingMaterial(7)).toBe('sleeveNeutral')
    expect(materials.sleeveNeutral.map).toBeNull()
  })

  it('the jacket follows the track state (neutral #3a3d46 for STOP), leans on an easel in the centre of the top and costs the same for every track', () => {
    for (const track of [0, 1, 2, 3, 4]) {
      const jacket = role(parts(true, track), 'jacket')[0]
      expect(jacket.mat).toBe(nowPlayingMaterial(track))
      expect(hexOf(materials[jacket.mat].color)).toBe(nowPlayingColour(track))
      expect(jacket.scale).toEqual([HIFI_JACKET.size, HIFI_JACKET.size, HIFI_JACKET.thickness])
      expect(jacket.rot![0]).toBeCloseTo(HIFI_JACKET.lean, 9)
      expect(extent(jacket).minY).toBeCloseTo(TOP + HIFI_JACKET.baseT, 9)
    }
    expect(new Set([0, 1, 2, 3, 4].map((t) => countTriangles(parts(true, t)))).size).toBe(1)
    expect(new Set([0, 1, 2, 3, 4].map((t) => countDrawCalls(parts(true, t)))).size).toBe(1)
    expect(role(hifiTableParts(placement().local), 'jacket')[0].mat).toBe('sleeveNeutral')
    // The stand is right of the turntable section and left of the lamp; the base plate rests on the top and the back leg tilts toward the jacket (jacket leans back at 0.3 rad).
    const local = placement().local
    const jacket = role(parts(), 'jacket')[0]
    expect(extent(jacket).minX).toBeGreaterThan(local.minX + 0.025 + HIFI_TURNTABLE_SECTION_W)
    // The lamp is in the right back corner: no lamp part overlaps the jacket or its stand in plan.
    const planOverlap = (a: ReturnType<typeof extent>, b: ReturnType<typeof extent>) => a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ
    for (const l of role(parts(), 'lamp')) for (const s of [...role(parts(), 'stand'), jacket]) expect(planOverlap(extent(l), extent(s)), `lamp ${l.mat} vs ${s.mat}`).toBe(false)
    const [base, leg] = role(parts(), 'stand')
    expect(extent(base).minY).toBeCloseTo(TOP, 9)
    expect(extent(base).maxY).toBeCloseTo(TOP + HIFI_JACKET.baseT, 9)
    expect(leg.rot![0]).not.toBe(0)
    expect(HIFI_JACKET.lean).toBeLessThan(0)
    const legTop = { y: leg.pos[1] + (HIFI_JACKET.legH / 2) * Math.cos(leg.rot![0]), z: leg.pos[2] + (HIFI_JACKET.legH / 2) * Math.sin(leg.rot![0]) }
    const jacketBackZ = jacket.pos[2] + (legTop.y - jacket.pos[1]) * Math.tan(HIFI_JACKET.lean) - HIFI_JACKET.thickness / 2
    expect(Math.abs(legTop.z - jacketBackZ)).toBeLessThan(0.008)
  })

  it('has two scattered cassettes on the vhsShell-mapped cassette geometry (tapeBlack and tapeBlue), lying flat on the top at different angles', () => {
    const tapes = role(parts(), 'cassette')
    expect(tapes).toHaveLength(2)
    expect(tapes.map((p) => p.mat).sort()).toEqual(['tapeBlack', 'tapeBlue'])
    expect(HIFI_CASSETTE).toEqual([0.11, 0.017, 0.07])
    for (const p of tapes) {
      expect(p.cassette).toBe(true)
      expect(isRealSizePart(p)).toBe(true)
      expect(p.scale).toEqual(HIFI_CASSETTE)
      expect(extent(p).minY).toBeCloseTo(TOP, 9)
      // The same mapped geometry as the desk cassette: the top face shows the label strip and reel window.
      const g = cassetteBoxGeometry(p.scale[0], p.scale[1], p.scale[2])
      expect(g.getAttribute('uv').count).toBe(24)
    }
    expect(new Set(tapes.map((p) => p.rot![1])).size).toBe(2)
    expect(materials.tapeBlack.type).toBe('MeshLambertMaterial')
    expect(cassetteBoxCount()).toBeGreaterThanOrEqual(1)
    // vhsShell mapping: with the canvas the two materials share the one vhsShell texture (no new texture).
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    expect(materials.tapeBlack.map).toBe(getSharedTexture('vhsShell'))
    expect(materials.tapeBlue.map).toBe(getSharedTexture('vhsShell'))
    expect(liveTextureCount()).toBe(32)
  })

  it('has a small brass desk lamp on the right: brass base and stem, a dark double-sided shade and an emissive amber bulb (MeshBasicMaterial), and no light', () => {
    const lamp = role(parts(), 'lamp')
    expect(lamp).toHaveLength(4)
    expect(lamp.filter((p) => p.mat === 'brass')).toHaveLength(2)
    const shade = lamp.find((p) => p.mat === 'hifiLampShade')!
    const bulb = lamp.find((p) => p.mat === 'hifiLampBulb')!
    expect(shade.geo).toBe('cone')
    expect(materials.brass.type).toBe('MeshLambertMaterial')
    expect(materials.hifiLampShade.side).toBe(DoubleSide)
    expect(luminance(materials.hifiLampShade.color)).toBeLessThan(0.03)
    expect(materials.hifiLampBulb.type).toBe('MeshBasicMaterial')
    const c = materials.hifiLampBulb.color
    expect(c.r).toBeGreaterThan(c.g)
    expect(c.g).toBeGreaterThan(c.b)
    expect(materials.hifiLampBulb.map).toBeNull()
    // The bulb is inside the shade, the lamp stands on the top at the right end and is small (under 0.2 m).
    expect(extent(bulb).minY).toBeGreaterThan(extent(shade).minY)
    expect(extent(bulb).maxY).toBeLessThan(extent(shade).maxY)
    for (const p of lamp) expect(extent(p).minY).toBeGreaterThanOrEqual(TOP - 1e-9)
    expect(Math.max(...lamp.map((p) => extent(p).maxY)) - TOP).toBeLessThan(0.2)
    expect(Math.min(...lamp.map((p) => extent(p).minX))).toBeGreaterThan(extent(role(parts(), 'jacket')[0]).minX)
    // No Part is a light: the console adds none (the scene has exactly four).
    expect(M3_LIGHT_COUNT).toBe(4)
  })

  it('lower tier: a wire rack of 12 tightly packed seeded LP sleeves, a silver receiver on a record stack, and a crate of 10 labelled vertical records, left to right', () => {
    const all = parts()
    const rack = role(all, 'rack')
    const sleeves = role(all, 'rackSleeve')
    const stack = role(all, 'stack')
    const receiver = role(all, 'receiver')
    const crate = role(all, 'crate')
    const records = role(all, 'record')
    const labels = role(all, 'recordLabel')
    // Wire rack: thin steel rods only (6 mm section), minimal frame.
    expect(rack).toHaveLength(6)
    for (const p of rack) {
      expect(p.mat).toBe('metal')
      expect(Math.min(...p.scale)).toBeLessThanOrEqual(0.006 + 1e-9)
      expect(extent(p).minY).toBeGreaterThanOrEqual(SHELF - 1e-9)
    }
    // 12 sleeves (0.31 m square, 10 mm) packed 10.8 mm apart, each with its own instance colour from the palette, all inside the rack.
    expect(sleeves).toHaveLength(HIFI_RACK.sleeves)
    expect(HIFI_RACK.sleeves).toBeGreaterThanOrEqual(12)
    expect(HIFI_RACK.sleeves).toBeLessThanOrEqual(16)
    expect(HIFI_RACK.pitch - HIFI_RACK.thickness).toBeLessThanOrEqual(0.001 + 1e-9)
    const rackBox = { minX: Math.min(...rack.map((p) => extent(p).minX)), maxX: Math.max(...rack.map((p) => extent(p).maxX)), minZ: Math.min(...rack.map((p) => extent(p).minZ)), maxZ: Math.max(...rack.map((p) => extent(p).maxZ)) }
    for (const [i, p] of sleeves.entries()) {
      expect(p.mat).toBe('sleeveTint')
      expect(p.colour).toBeDefined()
      expect(HIFI_RECORD_PALETTE).toContain(p.colour)
      expect(p.scale).toEqual([HIFI_RACK.size, HIFI_RACK.size, HIFI_RACK.thickness])
      expect(extent(p).minY).toBeCloseTo(SHELF, 9)
      expect(extent(p).minX).toBeGreaterThan(rackBox.minX)
      expect(extent(p).maxX).toBeLessThan(rackBox.maxX)
      expect(extent(p).minZ).toBeGreaterThan(rackBox.minZ)
      expect(extent(p).maxZ).toBeLessThan(rackBox.maxZ)
      if (i > 0) expect(p.pos[2] - sleeves[i - 1].pos[2]).toBeCloseTo(HIFI_RACK.pitch, 9)
    }
    // Receiver: a steel (metalCabinet stripe) body on a stack of flat records, with a dark dial window and buttons on the front (+z) face.
    expect(materials.sleeveTint.type).toBe('MeshLambertMaterial')
    expect(hexOf(materials.sleeveTint.color)).toBe('#ffffff')
    expect(stack).toHaveLength(HIFI_RECEIVER.stack)
    const body = receiver.find((p) => p.mat === 'fixtureHousing')!
    expect(body.atlas).toBeDefined()
    expect(extent(body).minY).toBeCloseTo(SHELF + HIFI_RECEIVER.stack * HIFI_RECEIVER.stackT, 9)
    expect(receiver.filter((p) => p.mat === 'bezel')).toHaveLength(3) // dial window and two buttons
    for (const p of [...receiver, ...role(all, 'receiverDial'), ...role(all, 'receiverDisplay')]) expect(extent(p).maxZ).toBeLessThanOrEqual(body.pos[2] + body.scale[2] / 2 + 0.0085)
    // Crate: two slats and two end boards in the weathered crate materials, standing on the shelf; records stand between the boards.
    expect(crate.map((p) => p.mat).sort()).toEqual(['crateSlat', 'crateSlat', 'crateWood', 'crateWood'])
    for (const p of crate) expect(extent(p).minY).toBeCloseTo(SHELF, 9)
    expect(records).toHaveLength(HIFI_RECORD_CRATE.records)
    const slats = crate.filter((p) => p.mat === 'crateSlat')
    const boards = crate.filter((p) => p.mat === 'crateWood')
    const innerMinZ = Math.min(...slats.map((p) => extent(p).maxZ))
    const innerMaxZ = Math.max(...slats.map((p) => extent(p).minZ))
    const innerMinX = Math.min(...boards.map((p) => extent(p).maxX))
    const innerMaxX = Math.max(...boards.map((p) => extent(p).minX))
    for (const p of records) {
      expect(p.mat).toBe('sleeveTint')
      expect(p.colour).toBeDefined()
      expect(extent(p).minY).toBeCloseTo(SHELF, 9)
      expect(extent(p).minZ).toBeGreaterThanOrEqual(innerMinZ - 1e-9)
      expect(extent(p).maxZ).toBeLessThanOrEqual(innerMaxZ + 1e-9)
      expect(extent(p).minX).toBeGreaterThanOrEqual(innerMinX - 1e-9)
      expect(extent(p).maxX).toBeLessThanOrEqual(innerMaxX + 1e-9)
    }
    // Each record shows a paper label band on its spine (top edge).
    expect(labels).toHaveLength(records.length)
    for (const [i, p] of labels.entries()) {
      expect(p.geo).toBe('plane')
      expect(p.mat).toBe('tapeLabel')
      expect(p.pos[2]).toBeCloseTo(records[i].pos[2], 9)
      expect(p.pos[1]).toBeGreaterThan(extent(records[i]).maxY)
    }
    // Left to right: rack, receiver, crate (local +x is the player's right).
    const maxX = (list: Part[]) => Math.max(...list.map((p) => extent(p).maxX))
    const minX = (list: Part[]) => Math.min(...list.map((p) => extent(p).minX))
    expect(maxX(rack)).toBeLessThan(minX(receiver))
    expect(maxX(receiver)).toBeLessThan(minX(crate))
    // Rack sleeves, stacked records and crate records are ONE instanced group (one draw call).
    const tintedParts = all.filter((p) => p.mat === 'sleeveTint')
    expect(tintedParts).toHaveLength(HIFI_RACK.sleeves + HIFI_RECEIVER.stack + HIFI_RECORD_CRATE.records)
    expect(new Set(tintedParts.map(partGroupKey)).size).toBe(1)
    expect(partGroupKey(tintedParts[0])).toContain('|ic')
    expect(partGroupKey(tintedParts[0])).not.toBe(partGroupKey({ ...tintedParts[0], colour: undefined }))
  })

  it('instanced sleeves and records are deterministic: seeded colours repeat exactly, differ by seed, never repeat in a row, and the whole console is identical on every build', () => {
    expect(hifiRecordColours(12, 3501)).toEqual(hifiRecordColours(12, 3501))
    expect(hifiRecordColours(12, 3501)).not.toEqual(hifiRecordColours(12, 3503))
    expect(hifiRecordColours(0, 1)).toEqual([])
    for (const seed of [1, 7, 3501, 3502, 3503, 99999]) {
      const c = hifiRecordColours(40, seed)
      expect(c).toHaveLength(40)
      for (let i = 0; i < c.length; i++) {
        expect(HIFI_RECORD_PALETTE).toContain(c[i])
        if (i > 0) expect(c[i]).not.toBe(c[i - 1])
      }
    }
    expect(parts()).toEqual(parts())
    expect(parts(true, 2)).toEqual(parts(true, 2))
    expect(role(parts(), 'rackSleeve').map((p) => p.colour)).toEqual(hifiRecordColours(HIFI_RACK.sleeves, 3501))
    expect(role(parts(), 'stack').map((p) => p.colour)).toEqual(hifiRecordColours(HIFI_RECEIVER.stack, 3502))
    expect(role(parts(), 'record').map((p) => p.colour)).toEqual(hifiRecordColours(HIFI_RECORD_CRATE.records, 3503))
  })

  it('the receiver dial and display are MeshBasicMaterial pairs: bright while playing, dim while stopped, two dark needles on the dial', () => {
    const stopped = parts(false)
    const playing = parts(true)
    const face = (all: Part[]) => role(all, 'receiverDial').find((p) => p.mat !== 'bezel')!
    const disp = (all: Part[]) => role(all, 'receiverDisplay')[0]
    expect(face(stopped).mat).toBe('receiverDialOff')
    expect(face(playing).mat).toBe('receiverDialOn')
    expect(disp(stopped).mat).toBe('receiverDisplayOff')
    expect(disp(playing).mat).toBe('receiverDisplayOn')
    expect({ ...face(playing), mat: 'receiverDialOff' }).toEqual(face(stopped))
    expect({ ...disp(playing), mat: 'receiverDisplayOff' }).toEqual(disp(stopped))
    for (const key of ['receiverDialOn', 'receiverDialOff', 'receiverDisplayOn', 'receiverDisplayOff'] as const) {
      expect(materials[key].type).toBe('MeshBasicMaterial')
      expect(materials[key].map).toBeNull()
    }
    expect(luminance(materials.receiverDialOn.color)).toBeGreaterThan(luminance(materials.receiverDialOff.color) * 2)
    expect(luminance(materials.receiverDisplayOn.color)).toBeGreaterThan(luminance(materials.receiverDisplayOff.color) * 2)
    // Amber dial, green display.
    expect(materials.receiverDialOn.color.r).toBeGreaterThan(materials.receiverDialOn.color.b)
    expect(materials.receiverDisplayOn.color.g).toBeGreaterThan(materials.receiverDisplayOn.color.r)
    // Two needles (thin dark boxes tilted about z) in front of the dial face.
    const needles = role(stopped, 'receiverDial').filter((p) => p.mat === 'bezel')
    expect(needles).toHaveLength(2)
    expect(new Set(needles.map((p) => p.rot![2])).size).toBe(2)
    for (const n of needles) expect(n.pos[2]).toBeGreaterThan(face(stopped).pos[2])
  })

  it('the front LED bar is a warm amber MeshBasicMaterial pair: bright while playing, dim while stopped, one part either way', () => {
    const off = role(parts(false), 'led')
    const on = role(parts(true), 'led')
    expect(off).toHaveLength(1)
    expect(on).toHaveLength(1)
    expect(off[0].mat).toBe('hifiLedOff')
    expect(on[0].mat).toBe('hifiLedOn')
    expect({ ...on[0], mat: 'hifiLedOff' }).toEqual(off[0])
    for (const key of ['hifiLedOn', 'hifiLedOff'] as const) {
      expect(materials[key].type).toBe('MeshBasicMaterial')
      expect(materials[key].map).toBeNull()
      const c = materials[key].color
      expect(c.r).toBeGreaterThan(c.g)
      expect(c.g).toBeGreaterThan(c.b)
    }
    expect(luminance(materials.hifiLedOn.color)).toBeGreaterThan(luminance(materials.hifiLedOff.color) * 2)
    expect(materials.hifiLedOn).not.toBe(materials.hifiLedOff)
    const e = extent(on[0])
    const local = placement().local
    expect(e.maxZ).toBeLessThanOrEqual(local.maxZ)
    expect(e.maxZ).toBeGreaterThan(local.maxZ - 0.02)
    expect(e.maxX - e.minX).toBeGreaterThan(0.9)
    expect(e.maxY).toBeLessThanOrEqual(TOP)
    expect(e.minY).toBeGreaterThan(TOP - 0.04)
  })

  it('the tabletop glow is a 24-segment additive disc on lampGlow, 2 mm above the top, inside the top rectangle: opacity 0.25 playing, 0.07 stopped', () => {
    const off = role(parts(false), 'glow')[0]
    const on = role(parts(true), 'glow')[0]
    expect(off.mat).toBe('hifiGlowOff')
    expect(on.mat).toBe('hifiGlowOn')
    expect({ ...on, mat: 'hifiGlowOff' }).toEqual(off)
    expect(on.geo).toBe('disc')
    expect(GEOMETRY_TRIANGLES.disc).toBe(24)
    expect(HIFI_GLOW_LIFT).toBe(0.002)
    const local = placement().local
    const e = extent(on)
    expect(e.minY).toBeCloseTo(TOP + 0.002, 9)
    expect(e.maxY).toBeCloseTo(TOP + 0.002, 9)
    expect(e.minX).toBeGreaterThanOrEqual(local.minX)
    expect(e.maxX).toBeLessThanOrEqual(local.maxX)
    expect(e.minZ).toBeGreaterThanOrEqual(local.minZ)
    expect(e.maxZ).toBeLessThanOrEqual(local.maxZ - 0.012 + 1e-9)
    for (const key of ['hifiGlowOn', 'hifiGlowOff'] as const) {
      const m = materials[key]
      expect(m.type).toBe('MeshBasicMaterial')
      expect(m.blending).toBe(AdditiveBlending)
      expect(m.depthWrite).toBe(false)
      expect(m.transparent).toBe(true)
      expect(m.polygonOffset).toBe(true)
      expect(m.map).toBeNull()
    }
    expect(HIFI_GLOW_OPACITY).toEqual({ on: 0.25, off: 0.07 })
    expect(materials.hifiGlowOn.opacity).toBeCloseTo(0.25, 9)
    expect(materials.hifiGlowOff.opacity).toBeCloseTo(0.07, 9)
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    expect(materials.hifiGlowOn.map).toBe(getSharedTexture('lampGlow'))
    expect(materials.hifiGlowOff.map).toBe(getSharedTexture('lampGlow'))
    expect(liveTextureCount()).toBe(32)
  })

  it('only switches `playing`-dependent parts: display, LED, glow, receiver dial and display and the tonearm pose; never the part count, triangles or the platter group', () => {
    const a = parts(false)
    const b = parts(true)
    expect(a).toHaveLength(b.length)
    expect(countTriangles(a)).toBe(countTriangles(b))
    expect(countDrawCalls(a)).toBe(countDrawCalls(b))
    const changed = a.map((p, i) => [p, b[i]] as const).filter(([x, y]) => JSON.stringify(x) !== JSON.stringify(y))
    expect(changed.length).toBeGreaterThanOrEqual(6)
    for (const [x, y] of changed) {
      const ok =
        (x.mat === 'trackDisplay' && y.mat === 'trackDisplayOn') ||
        (x.mat === 'hifiLedOff' && y.mat === 'hifiLedOn') ||
        (x.mat === 'hifiGlowOff' && y.mat === 'hifiGlowOn') ||
        (x.mat === 'receiverDialOff' && y.mat === 'receiverDialOn') ||
        (x.mat === 'receiverDisplayOff' && y.mat === 'receiverDisplayOn') ||
        (x.turntableGroup === 'tonearm' && y.turntableGroup === 'tonearm')
      expect(ok, `${x.mat} -> ${y.mat}`).toBe(true)
    }
    expect(a.filter((p) => p.turntableGroup === 'platter')).toEqual(b.filter((p) => p.turntableGroup === 'platter'))
  })

  it('every part is inside the 1.25 x 0.45 m footprint, above the floor and below the prop height; each tier rests on its surface', () => {
    const local = placement().local
    const height = placement().prop.height
    const upper: HifiRole[] = ['cassette', 'lamp', 'stand', 'jacket', 'glow', 'cover']
    const lower: HifiRole[] = ['rack', 'rackSleeve', 'stack', 'receiver', 'receiverDial', 'receiverDisplay', 'crate', 'record', 'recordLabel']
    for (const playing of [false, true]) {
      for (const track of [0, 4]) {
        for (const p of parts(playing, track)) {
          const e = extent(p)
          const where = `${p.mat} ${p.geo} ${p.hifiRole ?? ''} at ${p.pos.map((v) => v.toFixed(3)).join(',')}`
          expect(e.minX, where).toBeGreaterThanOrEqual(local.minX - 1e-9)
          expect(e.maxX, where).toBeLessThanOrEqual(local.maxX + 1e-9)
          expect(e.minZ, where).toBeGreaterThanOrEqual(local.minZ - 1e-9)
          expect(e.maxZ, where).toBeLessThanOrEqual(local.maxZ + 1e-9)
          expect(e.minY, where).toBeGreaterThanOrEqual(-1e-9)
          expect(e.maxY, where).toBeLessThanOrEqual(height + 1e-9)
          if (p.hifiRole && upper.includes(p.hifiRole)) expect(e.minY, where).toBeGreaterThanOrEqual(p.hifiRole === 'cover' ? TOP : TOP - 1e-9)
          if (p.hifiRole && lower.includes(p.hifiRole)) {
            expect(e.minY, where).toBeGreaterThanOrEqual(SHELF - 1e-9)
            expect(e.maxY, where).toBeLessThanOrEqual(SLAB_BOTTOM + 1e-9)
          }
        }
      }
    }
    expect(height).toBeCloseTo(0.95, 9)
    // The turntable assembly sits on the top (plinth feet at 0.62 m).
    for (const p of groups().static.filter((q) => q.mat === 'bezel' && q.scale[0] === 0.03)) expect(extent(p).minY).toBeCloseTo(TOP, 9)
  })

  it('costs exactly 1,250 triangles (static 1,006, platter 152, tonearm 92) and 34 draw-call groups, the same for every track', () => {
    const g = groups()
    expect(countTriangles(g.static)).toBe(1006)
    expect(countTriangles(g.platter)).toBe(152)
    expect(countTriangles(g.tonearm)).toBe(92)
    expect(countTriangles(parts())).toBe(TASK_35_1_CONSOLE)
    expect(countTriangles(parts(true, 2))).toBe(TASK_35_1_CONSOLE)
    const tri = (r: HifiRole) => countTriangles(role(parts(), r))
    expect(tri('frame')).toBe(70)
    expect(tri('cover')).toBe(72)
    expect(tri('cassette')).toBe(24)
    expect(tri('lamp')).toBe(80)
    expect(tri('rack')).toBe(72)
    expect(tri('rackSleeve')).toBe(144)
    expect(tri('stack') + tri('receiver') + tri('receiverDial') + tri('receiverDisplay')).toBe(24 + 48 + 36 + 12)
    expect(tri('crate')).toBe(48)
    expect(tri('record')).toBe(120)
    expect(tri('recordLabel')).toBe(20)
    expect(tri('stand') + tri('jacket')).toBe(36)
    expect(tri('led')).toBe(12)
    expect(tri('glow')).toBe(24)
    // Back faces of the two rear posts and the slab are wall-flush, the four posts have an open bottom.
    const own = parts().filter((p) => p.culledFaces)
    expect(own).toHaveLength(3)
    expect(own.every((p) => p.culledFaces!.join() === String(BOX_FACES.nz))).toBe(true)
    expect(parts().filter((p) => p.openBottom)).toHaveLength(4)
    expect(TASK_35_1_CONSOLE - TASK_34_1_TABLE).toBe(612)
    const obj = sceneDetailReport().objects.find((o) => o.name === 'record-player')!
    expect(obj.triangles).toBe(1250)
    for (const t of [0, 1, 2, 3, 4]) expect(countDrawCalls(parts(false, t)), String(t)).toBe(34)
    expect(obj.drawCalls).toBe(34)
  })
})

describe('task 35.1: floor loudspeaker', () => {
  afterEach(() => setCanvasFactory(null))
  const sp = () => speakerPlacement()
  const parts = () => speakerParts(sp().local, sp().prop.height, sp().wallBack)
  const extent = (p: Part) => {
    const size: Vec3 = p.geo === 'plane' || p.geo === 'disc' ? [p.scale[0], p.scale[1], 0] : p.scale
    const h = orientedHalfExtents(size, p.rot ?? [0, 0, 0])
    return { minX: p.pos[0] - h[0], maxX: p.pos[0] + h[0], minY: p.pos[1] - h[1], maxY: p.pos[1] + h[1], minZ: p.pos[2] - h[2], maxZ: p.pos[2] + h[2] }
  }

  it('is the solid non-interactable `loudspeaker` prop on the south wall beside the console: 0.34 x 0.32 m, 0.96 m tall, facing -z, back on the wall plane', () => {
    const p = sp().prop
    expect(p.id).toBe('loudspeaker')
    expect(p.solid).toBe(true)
    expect(p.facing).toBe('-z')
    expect(p.height).toBeCloseTo(0.96, 9)
    expect(p.box).toEqual({ minX: -2.49, maxX: -2.15, minZ: 3.68, maxZ: 4 })
    expect(COLLIDERS).toContain(p.box)
    expect(sp().wallBack).toBe(true)
    expect(INTERACTABLE_DEFS.some((d) => (d.id as string) === 'loudspeaker')).toBe(false)
    expect(STATION_DEFS.some((s) => (s.id as string) === 'loudspeaker')).toBe(false)
    expect(sp().local.maxX - sp().local.minX).toBeCloseTo(0.34, 9)
    expect(sp().local.maxZ - sp().local.minZ).toBeCloseTo(0.32, 9)
  })

  it('is a wood-grained cabinet with a woofer, a midrange, a tweeter (steel surrounds, dark cones) and a small port, all inside the speaker footprint on the floor', () => {
    const all = parts()
    const local = sp().local
    const cabinet = all.find((p) => p.mat === 'woodDark')!
    expect(all.filter((p) => p.mat === 'woodDark')).toHaveLength(1)
    expect(cabinet.metric).toBe(true)
    expect(cabinet.openBottom).toBe(true)
    expect(cabinet.culledFaces).toEqual([BOX_FACES.nz])
    expect(extent(cabinet).minY).toBeCloseTo(0, 9)
    expect(extent(cabinet).maxY).toBeCloseTo(sp().prop.height, 9)
    // Two cylinder surrounds (woofer 0.20 m, midrange 0.11 m) and a flat steel tweeter ring, each with a dark cone disc on top, plus the port.
    const rings = all.filter((p) => p.mat === 'metal')
    const cones = all.filter((p) => p.mat === 'plastic')
    expect(rings).toHaveLength(3)
    expect(cones).toHaveLength(3)
    expect(rings.filter((p) => p.geo === 'cylinderLow').map((p) => p.scale[0]).sort()).toEqual([0.11, 0.2])
    expect(all.filter((p) => p.mat === 'bezel')).toHaveLength(1)
    const ys = cones.map((p) => p.pos[1]).sort((a, b) => a - b)
    expect(ys).toEqual([0.38, 0.68, 0.84])
    for (const p of all) {
      const e = extent(p)
      const where = `${p.mat} ${p.geo}`
      expect(e.minX, where).toBeGreaterThanOrEqual(local.minX - 1e-9)
      expect(e.maxX, where).toBeLessThanOrEqual(local.maxX + 1e-9)
      expect(e.minZ, where).toBeGreaterThanOrEqual(local.minZ - 1e-9)
      expect(e.maxZ, where).toBeLessThanOrEqual(local.maxZ + 1e-9)
      expect(e.minY, where).toBeGreaterThanOrEqual(-1e-9)
      expect(e.maxY, where).toBeLessThanOrEqual(sp().prop.height + 1e-9)
    }
    // The drivers stand proud of the cabinet front (toward +z) and do not overlap each other.
    const cabFront = extent(cabinet).maxZ
    for (const p of [...rings, ...cones]) expect(extent(p).maxZ).toBeGreaterThan(cabFront)
  })

  it('costs exactly 180 triangles in 5 draw-call groups; the layout total adds the declared `loudspeaker` object', () => {
    expect(countTriangles(parts())).toBe(TASK_35_1_SPEAKER)
    expect(countDrawCalls(parts())).toBe(5)
    const obj = sceneDetailReport().objects.find((o) => o.name === 'loudspeaker')!
    expect(obj.triangles).toBe(180)
    expect(obj.drawCalls).toBe(5)
    expect(TASK_35_1_TRIANGLES).toBe(TASK_35_1_CONSOLE - TASK_34_1_TABLE + TASK_35_1_SPEAKER)
    expect(TASK_35_1_TRIANGLES).toBe(792)
  })
})

describe('task 34.1: wall-flush face culling and budgets', () => {
  afterEach(() => setCanvasFactory(null))
  /** Opaque solids a face can lie on: the wall Colliders and the door frames. */
  const solids = [...ROOM.walls, ...ROOM.doors.flatMap((d) => d.frames)]
  const extentOf = (p: Part) => {
    const h = orientedHalfExtents(p.scale, p.rot ?? [0, 0, 0])
    return { minX: p.pos[0] - h[0], maxX: p.pos[0] + h[0], minY: p.pos[1] - h[1], maxY: p.pos[1] + h[1], minZ: p.pos[2] - h[2], maxZ: p.pos[2] + h[2] }
  }
  /** World extent of a part of the named declared object: the console and the loudspeaker are built in their local frame (yaw pi about the footprint centre). */
  const worldExtent = (name: string, p: Part) => {
    const e = extentOf(p)
    if (name !== 'record-player' && name !== 'loudspeaker') return e
    const c = (name === 'loudspeaker' ? speakerPlacement() : hifiTablePlacement()).frame.position
    return { minX: c[0] - e.maxX, maxX: c[0] - e.minX, minY: e.minY, maxY: e.maxY, minZ: c[2] - e.maxZ, maxZ: c[2] - e.minZ }
  }
  /** Local face index to world face index for the object. */
  const worldFace = (name: string, f: number) => (name === 'record-player' || name === 'loudspeaker' ? ({ 0: 1, 1: 0, 4: 5, 5: 4 } as Record<number, number>)[f] : f)

  it('culled faces exist only where a face lies on an opaque wall or jamb plane (within 1 mm) inside that solid, below the ceiling, on unrotated boxes', () => {
    const tol = WALL_FLUSH_TOLERANCE
    expect(tol).toBe(0.001)
    let total = 0
    for (const o of declaredObjects()) {
      for (const p of o.parts) {
        if (!p.culledFaces?.length) continue
        expect(p.geo, o.name).toBe('box')
        expect(p.rot?.some((a) => Math.abs(a) > 1e-9) ?? false, o.name).toBe(false)
        const e = worldExtent(o.name, p)
        for (const f of p.culledFaces) {
          total++
          const wf = worldFace(o.name, f)
          expect([BOX_FACES.px, BOX_FACES.nx, BOX_FACES.pz, BOX_FACES.nz], `${o.name} face ${f}`).toContain(wf)
          const ok = solids.some((s) => {
            const withinX = e.minX >= s.minX - tol && e.maxX <= s.maxX + tol
            const withinZ = e.minZ >= s.minZ - tol && e.maxZ <= s.maxZ + tol
            const ySpan = e.minY >= -tol && e.maxY <= ROOM.height + tol
            if (!ySpan) return false
            if (wf === BOX_FACES.nz) return withinX && Math.abs(e.minZ - s.maxZ) <= tol
            if (wf === BOX_FACES.pz) return withinX && Math.abs(e.maxZ - s.minZ) <= tol
            if (wf === BOX_FACES.nx) return withinZ && Math.abs(e.minX - s.maxX) <= tol
            return withinZ && Math.abs(e.maxX - s.minX) <= tol
          })
          expect(ok, `${o.name} ${p.mat} face ${f} at ${p.pos.join(',')}`).toBe(true)
        }
      }
    }
    expect(total).toBe(24 + 4)
  })

  it('reclaims exactly 24 faces (48 triangles) on existing models: corner posts 8, bookcases 2 each, filing cabinets 1 each, conduit 1, wall grille 1, door detail 6', () => {
    const facesOf = (name: string) => declaredObjects().find((o) => o.name === name)!.parts.reduce((n, p) => n + (p.culledFaces?.length ?? 0), 0)
    const expected: Record<string, number> = {
      'corner-posts': 8,
      'shelf-a': 2,
      'shelf-b': 2,
      'shelf-c': 2,
      'filing-cabinet-a': 1,
      'filing-cabinet-b': 1,
      conduit: 1,
      ventilation: 1,
      'door-detail': 6,
    }
    let faces = 0
    for (const [name, n] of Object.entries(expected)) {
      expect(facesOf(name), name).toBe(n)
      faces += n
    }
    expect(faces).toBe(24)
    expect(faces * CULLED_FACE_SAVED_TRIANGLES).toBe(-TASK_34_1_RECLAIMED)
    // Nothing else carries a culled face except the console's three and the loudspeaker's one back face.
    const others = declaredObjects().filter((o) => !(o.name in expected) && o.name !== 'record-player' && o.name !== 'loudspeaker')
    for (const o of others) expect(o.parts.filter((p) => p.culledFaces?.length), o.name).toHaveLength(0)
    expect(facesOf('record-player')).toBe(3) // the two rear steel posts and the top slab
    expect(facesOf('loudspeaker')).toBe(1) // the cabinet back
    // Exact triangles of the changed objects.
    const report = sceneDetailReport()
    const tri = (name: string) => report.objects.find((o) => o.name === name)!.triangles
    expect(tri('corner-posts')).toBe(4 * 12 - 16)
    expect(tri('door-detail')).toBe(countTriangles(doorDetailParts()))
    // Six plates (two panels and two kickplates on the pillar, two kickplates on the outer jambs), 12 triangles each minus six culled faces.
    expect(doorDetailParts()).toHaveLength(6)
    expect(countTriangles(doorDetailParts())).toBe(6 * 12 - 12)
  })

  it('wallFlushFaces: exact 1 mm tolerance, needs the face inside the wall and the box unrotated and below the ceiling', () => {
    const wall = { minX: -5.3, maxX: -5, minZ: -4, maxZ: 4 }
    const box = (x0: number, x1: number, z0: number, z1: number, y0 = 0.2, y1 = 1, rot?: Vec3): Part => ({
      geo: 'box',
      mat: 'wood',
      pos: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2],
      scale: [x1 - x0, y1 - y0, z1 - z0],
      ...(rot ? { rot } : {}),
    })
    // Back face at x = -5 exactly or within 1 mm: culled (-x face, index 1). 2 mm away: not culled.
    expect(wallFlushFaces(box(-5, -4.6, 0, 1), [wall], 3)).toEqual([BOX_FACES.nx])
    expect(wallFlushFaces(box(-5.0009, -4.6, 0, 1), [wall], 3)).toEqual([BOX_FACES.nx])
    expect(wallFlushFaces(box(-4.998, -4.6, 0, 1), [wall], 3)).toEqual([])
    // The face must lie inside the wall (z within -4..4) and below the ceiling; rotated and non-box parts are never culled.
    expect(wallFlushFaces(box(-5, -4.6, 3.5, 4.5), [wall], 3)).toEqual([])
    expect(wallFlushFaces(box(-5, -4.6, 0, 1, 0.2, 3.2), [wall], 3)).toEqual([])
    expect(wallFlushFaces(box(-5, -4.6, 0, 1, 0.2, 1, [0, 0.3, 0]), [wall], 3)).toEqual([])
    expect(wallFlushFaces({ ...box(-5, -4.6, 0, 1), geo: 'cylinderLow' }, [wall], 3)).toEqual([])
    // A corner box lies on two walls: two faces.
    const north = { minX: -5.3, maxX: 5.3, minZ: -4.3, maxZ: -4 }
    expect(wallFlushFaces(box(-5, -4.9, -4, -3.9), [wall, north], 3)).toEqual([BOX_FACES.nx, BOX_FACES.nz])
  })

  it('culledBoxGeometry removes exactly the named faces (2 triangles each), keeps UVs, is cached per (geometry, faces) and openBottomBoxGeometry is the [3] case', () => {
    const base = woodBoxGeometry(0.4, 0.3, 0.2)
    const back = culledBoxGeometry(base, [BOX_FACES.nz])
    expect(back).not.toBe(base)
    expect(base.getIndex()!.count / 3).toBe(12)
    expect(back.getIndex()!.count / 3).toBe(10)
    expect(culledBoxGeometry(base, [BOX_FACES.nz])).toBe(back)
    expect(culledBoxGeometry(base, [BOX_FACES.nz, BOX_FACES.nz])).toBe(back)
    const two = culledBoxGeometry(base, [BOX_FACES.nx, BOX_FACES.nz])
    expect(two.getIndex()!.count / 3).toBe(8)
    expect(culledBoxGeometry(base, [BOX_FACES.nz, BOX_FACES.nx])).toBe(two)
    const used = new Set(Array.from(two.getIndex()!.array).map((i) => Math.floor(i / 4)))
    expect([...used].sort()).toEqual([0, 2, 3, 4])
    expect(two.getAttribute('uv').array).toEqual(base.getAttribute('uv').array)
    expect(two.getAttribute('position').array).toEqual(base.getAttribute('position').array)
    expect(openBottomBoxGeometry(base)).toBe(culledBoxGeometry(base, [BOX_FACES.ny]))
    // Bottom plus back: the removedFaces of a part combine both.
    const part: Part = { geo: 'box', mat: 'wood', pos: [0, 0.1, 0], scale: [1, 0.2, 1], openBottom: true, culledFaces: [BOX_FACES.nz] }
    expect(removedFaces(part)).toEqual([BOX_FACES.ny, BOX_FACES.nz])
    expect(partTriangles(part)).toBe(12 - 4)
    expect(culledBoxGeometry(base, removedFaces(part)).getIndex()!.count / 3).toBe(8)
    expect(partGroupKey(part)).not.toBe(partGroupKey({ ...part, culledFaces: undefined }))
    expect(() => culledBoxGeometry(base, [6])).toThrow()
    expect(() => culledBoxGeometry(geometries.plane, [0])).toThrow()
  })

  it('every cached culled geometry of the console, the corner posts and the unit box is disposed exactly once and the caches are twice-safe', () => {
    const pl = hifiTablePlacement()
    const flagged = hifiTableParts(pl.local, { playing: false, track: 4 }, pl.wallBack).filter((p) => removedFaces(p).length > 0)
    expect(flagged.length).toBe(5) // the four steel posts (open bottom, the two rear ones also wall-flush at the back) and the top slab (wall-flush back)
    const bases = flagged.map((p) => (p.atlas ? atlasBoxGeometry(p.scale[0], p.scale[1], p.scale[2], p.atlas.rect, p.atlas.faces, p.atlas.plain) : woodBoxGeometry(p.scale[0], p.scale[1], p.scale[2])))
    const variants = flagged.map((p, i) => culledBoxGeometry(bases[i], removedFaces(p)))
    const posts = cornerPostParts()
    const postVariants = posts.map((p) => culledBoxGeometry(geometries.box, removedFaces(p)))
    expect(new Set(postVariants).size).toBe(4)
    expect(posts.every((p) => removedFaces(p).length === 2)).toBe(true)
    // Cached: a second request creates nothing new.
    flagged.forEach((p, i) => expect(culledBoxGeometry(bases[i], removedFaces(p))).toBe(variants[i]))
    posts.forEach((p, i) => expect(culledBoxGeometry(geometries.box, removedFaces(p))).toBe(postVariants[i]))
    const spies = [...new Set([...variants, ...postVariants, ...bases])].map((g) => vi.spyOn(g, 'dispose'))
    expect(openBottomBoxCount()).toBeGreaterThanOrEqual(new Set([...variants, ...postVariants]).size)
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    disposeSharedResources()
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1)
    expect(openBottomBoxCount()).toBe(0)
    expect(woodBoxCount()).toBe(0)
  })

  it('budgets (35.1): 19,988 triangles (exact, at most 20,000), 403 draw calls (under 425), 4 lights, 32 textures, 7.703 MiB, nothing new disposed twice', () => {
    const report = sceneDetailReport()
    expect(TASK_34_1_TRIANGLES).toBe(64)
    expect(TRIANGLE_CAP).toBe(20000)
    expect(DRAW_CALL_CAP).toBe(425)
    expect(SCENE_TRIANGLE_BUDGET).toBe(TRIANGLE_CAP)
    expect(report.totalTriangles).toBe(19132 + TASK_34_1_TRIANGLES + TASK_35_1_TRIANGLES)
    expect(report.totalTriangles).toBe(19988)
    expect(report.totalTriangles).toBeLessThanOrEqual(TRIANGLE_CAP)
    expect(report.totalDrawCalls).toBe(403)
    expect(report.totalDrawCalls).toBeLessThan(DRAW_CALL_CAP)
    const table = new Map(report.objects.map((o) => [o.name, o]))
    expect(table.get('record-player')).toEqual({ name: 'record-player', triangles: 1250, drawCalls: 34 })
    expect(table.get('loudspeaker')).toEqual({ name: 'loudspeaker', triangles: 180, drawCalls: 5 })
    expect(M3_LIGHT_COUNT).toBe(4)
    expect(MAX_LIGHTS).toBe(4)
    expect(lightingSource.match(/<pointLight /g)?.length).toBe(3)
    expect(lightingSource.match(/<ambientLight /g)?.length).toBe(1)
    expect(report.textureCount).toBe(32)
    expect(report.textureMemoryBytes / 1048576).toBeCloseTo(7.703, 3)
    setCanvasFactory(() => fakeCanvas())
    ensureSharedTextures()
    expect(liveTextureCount()).toBe(32)
    const texSpies = TEXTURE_IDS.map((id) => vi.spyOn(getSharedTexture(id)!, 'dispose'))
    disposeSharedResources()
    disposeSharedResources()
    for (const s of texSpies) expect(s).toHaveBeenCalledTimes(1)
    expect(liveTextureCount()).toBe(0)
    // No new shared geometry key and no timer or storage in the new Hi-Fi code of Props.tsx.
    const propsSrc = Object.values(import.meta.glob('./Props.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0]
    expect(propsSrc).not.toMatch(/setTimeout|setInterval|localStorage/)
    expect(propsSrc).toContain('hifiTableGroups(box, { playing, track }, wallBack)')
    expect(propsSrc).toContain('<Faced box={box} facing={facing}>')
    // 34.2 wiring: WorldScene -> Props (turntableTrack) -> RecordPlayer (track) -> HifiTable; the default stays neutral (4).
    const worldSrc = Object.values(import.meta.glob('../WorldScene.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0]
    expect(worldSrc).toMatch(/<Props\b[^>]*\bturntableTrack=\{audioTrack\.track\}/)
    expect(propsSrc).toMatch(/<RecordPlayer[^>]*\btrack=\{turntableTrack\}/)
    expect(propsSrc).toContain('turntableTrack = 4')
  })

  it('changing only the track changes only the jacket material (sleeves and every other part are identical)', () => {
    const local = hifiTablePlacement().local
    const wb = hifiTablePlacement().wallBack
    const mats = (track: number) => hifiTableParts(local, { playing: true, track }, wb).map((p) => `${p.hifiRole ?? ''}:${p.mat}`)
    const base = mats(0)
    for (const t of [1, 2, 3, 4]) {
      const next = mats(t)
      const diff = next.map((m, i) => (m === base[i] ? -1 : i)).filter((i) => i >= 0)
      expect(diff, String(t)).toHaveLength(1)
      expect(next[diff[0]].startsWith('jacket:')).toBe(true)
    }
    for (const t of [0, 1, 2, 3]) expect(mats(t).find((m) => m.startsWith('jacket:'))).toBe(`jacket:${HIFI_SLEEVE_MATERIALS[t]}`)
    expect(mats(4).find((m) => m.startsWith('jacket:'))).toBe('jacket:sleeveNeutral')
  })
})

describe('task 35.2: playback state wiring of the console builder', () => {
  const pl = () => hifiTablePlacement()
  const all = (playing: boolean, track: number) => hifiTableParts(pl().local, { playing, track }, pl().wallBack)
  const byRole = (parts: readonly Part[], r: HifiRole) => parts.filter((p) => p.hifiRole === r)
  const diff = (a: readonly Part[], b: readonly Part[]) => a.map((p, i) => [p, b[i]] as const).filter(([x, y]) => JSON.stringify(x) !== JSON.stringify(y))

  it('playing switches the receiver dial and display, the LED bar and the glow between their stopped and playing materials', () => {
    const stopped = all(false, 1)
    const playing = all(true, 1)
    expect(byRole(stopped, 'receiverDial').find((p) => p.mat.startsWith('receiverDial'))!.mat).toBe('receiverDialOff')
    expect(byRole(playing, 'receiverDial').find((p) => p.mat.startsWith('receiverDial'))!.mat).toBe('receiverDialOn')
    expect(byRole(stopped, 'receiverDisplay')[0].mat).toBe('receiverDisplayOff')
    expect(byRole(playing, 'receiverDisplay')[0].mat).toBe('receiverDisplayOn')
    expect(byRole(stopped, 'led')[0].mat).toBe('hifiLedOff')
    expect(byRole(playing, 'led')[0].mat).toBe('hifiLedOn')
    expect(byRole(stopped, 'glow')[0].mat).toBe('hifiGlowOff')
    expect(byRole(playing, 'glow')[0].mat).toBe('hifiGlowOn')
    expect(materials.hifiGlowOn.opacity).toBeCloseTo(0.25, 9)
    expect(materials.hifiGlowOff.opacity).toBeCloseTo(0.07, 9)
  })

  it('playing moves the tonearm pose and the track display, and leaves the brass lamp bulb lit in both states (it is a lamp, not an indicator)', () => {
    const g = (playing: boolean) => hifiTableGroups(pl().local, { playing, track: 0 }, pl().wallBack)
    const a = g(false)
    const b = g(true)
    expect(a.tonearm).toHaveLength(b.tonearm.length)
    expect(JSON.stringify(a.tonearm)).not.toBe(JSON.stringify(b.tonearm))
    expect(a.static.some((p) => p.mat === 'trackDisplay')).toBe(true)
    expect(b.static.some((p) => p.mat === 'trackDisplayOn')).toBe(true)
    for (const parts of [all(false, 0), all(true, 0)]) {
      expect(byRole(parts, 'lamp').filter((p) => p.mat === 'hifiLampBulb')).toHaveLength(1)
    }
    expect(JSON.stringify(byRole(all(false, 0), 'lamp'))).toBe(JSON.stringify(byRole(all(true, 0), 'lamp')))
  })

  it('the jacket material follows the track (0..3 colours, 4 neutral) in both playing states', () => {
    for (const playing of [false, true]) {
      for (const track of [0, 1, 2, 3, 4]) {
        expect(byRole(all(playing, track), 'jacket')[0].mat, `${playing} ${track}`).toBe(nowPlayingMaterial(track))
      }
    }
  })

  it('changing only the track changes only the jacket material; changing only playing does not change the jacket', () => {
    for (const playing of [false, true]) {
      const changed = diff(all(playing, 0), all(playing, 3))
      expect(changed).toHaveLength(1)
      expect(changed[0][0].hifiRole).toBe('jacket')
      expect({ ...changed[0][0], mat: changed[0][1].mat }).toEqual(changed[0][1])
    }
    for (const track of [0, 2, 4]) {
      expect(byRole(all(false, track), 'jacket')).toEqual(byRole(all(true, track), 'jacket'))
      expect(diff(all(false, track), all(true, track)).some(([x]) => x.hifiRole === 'jacket')).toBe(false)
    }
  })
})
