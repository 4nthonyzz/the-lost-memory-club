/**
 * Shared geometries and materials, created once and reused by every scene
 * component. No material reads lock state or memoryShifted; the Memory_Shift
 * driver mutates wall, screen and overlay materials from the blend progress.
 */
import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  DoubleSide,
  ClampToEdgeWrapping,
  CylinderGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  NearestFilter,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  SphereGeometry,
} from 'three'
import { ROOM } from '../layout/roomLayout'
import { ARCADE_SCREEN_BASE_COLORS, BASE_CRT_SCREEN_COLOR, BASE_WALL_COLOR, arcadeScreenBaseColor } from './memoryShift'
import {
  FLOOR_METRES_PER_REPEAT,
  SPINE_CASE_SIDE_CELL,
  SPINE_COVER_CELL,
  SPINE_VARIANT_COUNT,
  TEXTURE_IDS,
  TEXTURE_SPECS,
  WALL_METRES_U,
  WALL_METRES_V,
  type Ctx2D,
  type TextureFilter,
  spineCellUv,
  type TextureId,
} from './proceduralTextures'

export const geometries = {
  /** Unit box; size it with mesh `scale`. */
  box: new BoxGeometry(1, 1, 1),
  /** Unit plane in the XY plane; rotate and scale per use. */
  plane: new PlaneGeometry(1, 1),
  /** Unit-height cylinder of radius 0.5 (lamp base, knobs). */
  cylinder: new CylinderGeometry(0.5, 0.5, 1, 12),
  /** Low-segment cylinder (8 sides) for small parts: knobs, posts, antenna rods. */
  cylinderLow: new CylinderGeometry(0.5, 0.5, 1, 8),
  /** Low-segment sphere (8 x 6) of diameter 1: joystick ball, bulb, bell. */
  sphere: new SphereGeometry(0.5, 8, 6),
}

/**
 * Unit box per spine variant (task 18.2) with remapped UVs: the +Z face (the spine) shows the variant's atlas
 * cell, every other face shows the cover cell (books) or the plastic side cell (slipcases). One InstancedMesh
 * per variant keeps the shared geometry, so draw calls stay at one per variant per bookcase.
 */
function makeSpineGeometry(variant: number): BoxGeometry {
  const g = new BoxGeometry(1, 1, 1)
  const uv = g.getAttribute('uv')
  const side = spineCellUv(variant < 3 ? SPINE_COVER_CELL : SPINE_CASE_SIDE_CELL)
  const spine = spineCellUv(variant)
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z, four vertices each, local uv in 0..1.
  for (let i = 0; i < uv.count; i++) {
    const r = Math.floor(i / 4) === 4 ? spine : side
    uv.setXY(i, r.u0 + uv.getX(i) * (r.u1 - r.u0), r.v0 + uv.getY(i) * (r.v1 - r.v0))
  }
  uv.needsUpdate = true
  return g
}

export const spineGeometries: readonly BoxGeometry[] = Array.from({ length: SPINE_VARIANT_COUNT }, (_, v) => makeSpineGeometry(v))

const lambert = (color: string) => new MeshLambertMaterial({ color })

/** Hidden by default (opacity 0, invisible); the Memory_Shift driver fades them in. Visual only. */
const overlay = (color: string) =>
  new MeshBasicMaterial({ color, transparent: true, opacity: 0, visible: false, depthWrite: false })

export const materials = {
  floor: lambert('#3a3340'),
  wall: lambert(BASE_WALL_COLOR),
  ceiling: lambert('#2c2838'),
  wood: lambert('#6b4a30'),
  woodDark: lambert('#4a3220'),
  metal: lambert('#777c86'),
  plastic: lambert('#22232a'),
  crate: lambert('#8a6a3c'),
  rug: lambert('#7a2c3c'),
  /** Framed posters. Flat colours are the fallback; the poster textures replace them. */
  posterSunset: lambert('#8a2a6a'),
  posterReel: lambert('#0c3a44'),
  doorFrame: lambert('#3b2a1d'),
  tapeBlack: lambert('#15151a'),
  tapeLabel: lambert('#d8d2b8'),
  cabinet: lambert('#5a1f7a'),
  lampShade: lambert('#e8c27a'),
  /** 13.6 detail materials. All fixed colours, none reads game state. */
  casing: lambert('#8d887a'),
  casingDark: lambert('#5f5b52'),
  bezel: lambert('#0c0c10'),
  displayGreen: new MeshBasicMaterial({ color: '#2a8a5a' }),
  sideArtA: lambert('#d9347a'),
  sideArtB: lambert('#26b5c9'),
  btnRed: lambert('#d62a2a'),
  btnYellow: lambert('#e8c42a'),
  btnGreen: lambert('#2aa84a'),
  btnBlue: lambert('#2a5ad6'),
  btnWhite: lambert('#e8e8ec'),
  btnOrange: lambert('#e87a2a'),
  bulb: new MeshBasicMaterial({ color: '#fff2c0' }),
  fluorescent: new MeshBasicMaterial({ color: '#e8f4ff' }),
  trim: lambert('#2a2230'),
  skirting: lambert('#1f1a26'),
  fabric: lambert('#3d5a4c'),
  fabricLight: lambert('#4f7561'),
  rugLight: lambert('#8c3446'),
  rugWorn: lambert('#55202e'),
  crateSlat: lambert('#6e5230'),
  spineA: lambert('#a02a2a'),
  spineB: lambert('#2a4aa0'),
  spineC: lambert('#c9a02a'),
  /** White base: the spine atlas (when available) is multiplied by each book's instance colour. Used by the bookcase InstancedMeshes. */
  bookSpine: lambert('#ffffff'),
  /** 15.6 Arcade_Area dressing. Fixed colours. Sign face and lettering are emissive basic materials, not lights. */
  signBack: lambert('#1a1020'),
  signGlow: new MeshBasicMaterial({ color: '#2a0e2e' }),
  signText: new MeshBasicMaterial({ color: '#ffb347' }),
  /** 15.7: textured sign face (emissive basic material, not a light) and other new detail materials. */
  signFace: new MeshBasicMaterial({ color: '#2a0e2e' }),
  grille: lambert('#1c1d24'),
  coinGlow: new MeshBasicMaterial({ color: '#ffcf5a' }),
  mug: lambert('#b4503c'),
  paper: lambert('#e6dfc6'),
  /** Powered-down screen and marquee of the companion cabinet and the CRT stack. */
  screenOff: lambert('#050508'),
  marqueeOff: lambert('#2a2018'),
  runner: lambert('#4a2a6a'),
  /** 18.1 north-wall focal zone placeholders: grey metal filing cabinets and a cork board. */
  filingGrey: lambert('#6f7782'),
  filingDark: lambert('#59606b'),
  /** 18.3: the second cabinet is a slightly warmer, greener grey. Label slots are bright metal. */
  filingGreyB: lambert('#7a7d70'),
  filingDarkB: lambert('#656858'),
  labelSlot: lambert('#d4d8de'),
  /** Cork board: the cork texture (white multiplier) replaces the flat colour when a canvas exists. */
  cork: lambert('#9a7448'),
  /** Woven rug decal. A separate material from `rug`, which colours the couch. */
  rugWoven: lambert('#7a2c3c'),
  /** Overhead conduit pipes and clamps, junction box cover. */
  conduit: lambert('#6b6e76'),
  /** Archival cardboard boxes and their packing tape. */
  cardboard: lambert('#a98457'),
  cardboardDark: lambert('#7e603a'),
  /** Warm desk-lamp shade: emissive basic material (not a light). The halo is an additive glow plane. */
  lampEmissive: new MeshBasicMaterial({ color: '#ffb255' }),
  lampHalo: new MeshBasicMaterial({
    color: '#ffb060',
    transparent: true,
    opacity: 0.55,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
  }),
  /** Screens: tinted only by the Memory_Shift blend. They never read lock state. */
  crtScreen: new MeshBasicMaterial({ color: BASE_CRT_SCREEN_COLOR }),
  /** Per-cabinet screens: flat game colours are the no-canvas fallback; with a canvas the attract texture is attached and the base becomes white. Tinted by Memory_Shift. */
  arcadeScreenSnake: new MeshBasicMaterial({ color: ARCADE_SCREEN_BASE_COLORS.snake }),
  arcadeScreenMaze: new MeshBasicMaterial({ color: ARCADE_SCREEN_BASE_COLORS.maze }),
  arcadeScreenFrequency: new MeshBasicMaterial({ color: ARCADE_SCREEN_BASE_COLORS.frequency }),
  /** Per-cabinet lit marquees (flat colour fallback, marquee texture when a canvas exists) and coloured side T-molding. */
  marqueeSnake: new MeshBasicMaterial({ color: '#1fa855' }),
  marqueeMaze: new MeshBasicMaterial({ color: '#c8203c' }),
  marqueeFrequency: new MeshBasicMaterial({ color: '#16b8d4' }),
  moldingSnake: new MeshBasicMaterial({ color: '#22c55e' }),
  moldingMaze: new MeshBasicMaterial({ color: '#dc143c' }),
  moldingFrequency: new MeshBasicMaterial({ color: '#ffb000' }),
  /** Plain dark control deck panel (the old deck texture marked a single joystick, so 3D parts carry the detail now). */
  deckPlate: lambert('#1a1b22'),
  led: new MeshBasicMaterial({ color: '#ff4040' }),
  /**
   * 19.2: fixed-colour detail screens. None of them is tinted by Memory_Shift (that driver only owns
   * crtScreen and arcadeScreen). The reference monitor card is dimmed so it never outshines the main CRT.
   * Flat colours are the fallback when no canvas exists.
   */
  smpteScreen: new MeshBasicMaterial({ color: '#3c4650' }),
  timecode: new MeshBasicMaterial({ color: '#2a8a5a' }),
  /** Brushed-metal tape slot flap and frame rails on the VCR. */
  tapeSlotMetal: new MeshStandardMaterial({ color: '#9aa0aa', metalness: 0.7, roughness: 0.35 }),
  cableBlack: lambert('#101014'),
  cableGrey: lambert('#5a5d66'),
  cableRed: lambert('#a02020'),
  /** Memory_Shift set dressing, faded by opacity. */
  shiftPoster: overlay('#8a1c2e'),
  shiftPlaque: overlay('#2a0a14'),
}

/** Overlay materials with their full opacity, in the order the driver fades them. */
export const overlayMaterials = [
  { material: materials.shiftPoster, maxOpacity: 0.95 },
  { material: materials.shiftPlaque, maxOpacity: 0.95 },
]

/**
 * Wall boxes with metric UVs (task 18.3): the wall texture repeats every WALL_METRES_U metres along the wall
 * and once per WALL_METRES_V metres of height, so the wainscot panels keep their size on every wall length.
 * UVs follow world coordinates, so neighbouring wall boxes line up. Cached by footprint, disposed once.
 */
const wallGeometryCache = new Map<string, BoxGeometry>()

export function wallGeometry(box: { minX: number; maxX: number; minZ: number; maxZ: number }, height: number): BoxGeometry {
  const key = `${box.minX},${box.maxX},${box.minZ},${box.maxZ},${height}`
  const cached = wallGeometryCache.get(key)
  if (cached) return cached
  const cx = (box.minX + box.maxX) / 2
  const cz = (box.minZ + box.maxZ) / 2
  const g = new BoxGeometry(box.maxX - box.minX, height, box.maxZ - box.minZ)
  const pos = g.getAttribute('position')
  const uv = g.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) {
    const wx = pos.getX(i) + cx
    const wy = pos.getY(i) + height / 2
    const wz = pos.getZ(i) + cz
    // Face order: +x, -x, +y, -y, +z, -z.
    const face = Math.floor(i / 4)
    if (face < 2) uv.setXY(i, wz / WALL_METRES_U, wy / WALL_METRES_V)
    else if (face < 4) uv.setXY(i, wx / WALL_METRES_U, wz / WALL_METRES_V)
    else uv.setXY(i, wx / WALL_METRES_U, wy / WALL_METRES_V)
  }
  uv.needsUpdate = true
  wallGeometryCache.set(key, g)
  return g
}

/**
 * Wood boards with metric UVs (task 19.2). The wood texture repeats once per WOOD_METRES_PER_REPEAT metres,
 * so the grain keeps its scale on long boards instead of stretching over one face. The texture's grain runs
 * along its u axis, so on every face u follows the longer of the face's two in-plane edges: the grain runs
 * along the board's longest axis, and an end cap uses the longer of its own two edges.
 * Geometries are real-size boxes (the part's mesh scale is 1), cached by dimensions rounded to 0.1 mm so
 * equal boards share one geometry and one instanced draw. Disposed once by disposeSharedResources().
 */
export const WOOD_METRES_PER_REPEAT = 0.6
const woodBoxCache = new Map<string, BoxGeometry>()

const round4 = (v: number) => Math.round(v * 1e4) / 1e4

export function woodBoxGeometry(w: number, h: number, d: number): BoxGeometry {
  const sx = round4(w)
  const sy = round4(h)
  const sz = round4(d)
  const key = `${sx},${sy},${sz}`
  const cached = woodBoxCache.get(key)
  if (cached) return cached
  const g = new BoxGeometry(sx, sy, sz)
  const pos = g.getAttribute('position')
  const uv = g.getAttribute('uv')
  const size = [sx, sy, sz] as const
  // Face order: +x, -x, +y, -y, +z, -z. In-plane axes (a, b) of each face as indices into x, y, z.
  const axes = [[2, 1], [2, 1], [0, 2], [0, 2], [0, 1], [0, 1]] as const
  for (let i = 0; i < uv.count; i++) {
    const [a, b] = axes[Math.floor(i / 4)]
    const pa = [pos.getX(i), pos.getY(i), pos.getZ(i)][a] + size[a] / 2
    const pb = [pos.getX(i), pos.getY(i), pos.getZ(i)][b] + size[b] / 2
    if (size[b] > size[a]) uv.setXY(i, pb / WOOD_METRES_PER_REPEAT, pa / WOOD_METRES_PER_REPEAT)
    else uv.setXY(i, pa / WOOD_METRES_PER_REPEAT, pb / WOOD_METRES_PER_REPEAT)
  }
  uv.needsUpdate = true
  woodBoxCache.set(key, g)
  return g
}

/** Number of live cached wood geometries (tests and reports). */
export const woodBoxCount = (): number => woodBoxCache.size

// ---------------------------------------------------------------------------------------------
// Procedural canvas textures (task 15.7, 18.3, 19.2). Deterministic, drawn once, never redrawn per frame.
// Budget: 21 textures (see proceduralTextures.ts for the estimate), limit 8 MB.
// ---------------------------------------------------------------------------------------------

/** The part of a canvas element that createCanvasTexture needs. */
export interface CanvasLike {
  width: number
  height: number
  getContext(type: '2d'): Ctx2D | null
}

export type CanvasFactory = () => CanvasLike | null

/** Returns null outside a browser or in jsdom (no canvas support), so materials keep their flat colours. */
const defaultCanvasFactory: CanvasFactory = () => {
  if (typeof document === 'undefined') return null
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return null
  return document.createElement('canvas') as unknown as CanvasLike
}

let canvasFactory: CanvasFactory = defaultCanvasFactory
/** Every texture created and not yet disposed, in creation order. */
const registry: CanvasTexture[] = []
const cache = new Map<TextureId, CanvasTexture | null>()

export interface CanvasTextureOptions {
  filter?: TextureFilter
  wrap?: 'clamp' | 'repeat'
  repeat?: readonly [number, number]
}

/**
 * Draws once on a canvas and wraps it in a CanvasTexture (sRGB, needsUpdate once). Returns null when no
 * canvas or no 2D context is available. The texture is registered for disposeSharedResources().
 */
export function createCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: Ctx2D, w: number, h: number) => void,
  options: CanvasTextureOptions = {},
): CanvasTexture | null {
  const canvas = canvasFactory()
  if (!canvas) return null
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  draw(ctx, width, height)
  const tex = new CanvasTexture(canvas as unknown as HTMLCanvasElement)
  tex.colorSpace = SRGBColorSpace
  if ((options.filter ?? 'mipmap') === 'nearest') {
    tex.generateMipmaps = false
    tex.minFilter = NearestFilter
    tex.magFilter = NearestFilter
  } else {
    tex.generateMipmaps = true
    tex.minFilter = LinearMipmapLinearFilter
    tex.magFilter = LinearFilter
    tex.anisotropy = 4
  }
  const wrap = options.wrap === 'repeat' ? RepeatWrapping : ClampToEdgeWrapping
  tex.wrapS = wrap
  tex.wrapT = wrap
  if (options.repeat) tex.repeat.set(options.repeat[0], options.repeat[1])
  tex.needsUpdate = true
  registry.push(tex)
  return tex
}

function repeatFor(id: TextureId): readonly [number, number] | undefined {
  if (id !== 'floor') return undefined
  const b = ROOM.bounds
  return [(b.maxX - b.minX) / FLOOR_METRES_PER_REPEAT, (b.maxZ - b.minZ) / FLOOR_METRES_PER_REPEAT]
}

/** Lazily creates texture `id` once. Null when the environment has no canvas. */
export function getSharedTexture(id: TextureId): CanvasTexture | null {
  if (cache.has(id)) return cache.get(id) ?? null
  const spec = TEXTURE_SPECS[id]
  const tex = createCanvasTexture(spec.width, spec.height, (c, w, h) => spec.draw(c, w, h, spec.seed), {
    filter: spec.filter,
    wrap: spec.wrap,
    repeat: repeatFor(id),
  })
  cache.set(id, tex)
  return tex
}

/** True when the textured look is available (used to keep the box-letter sign only as a fallback). */
export const hasSharedTexture = (id: TextureId): boolean => getSharedTexture(id) !== null

interface TextureBinding {
  material: keyof typeof materials
  texture: TextureId
  /** Colour multiplier once textured. Omitted for materials whose colour the Memory_Shift driver owns. */
  color?: string
  /** Flat colour restored when the texture is disposed (the screens switch to white while textured). */
  fallbackColor?: string
}

/** Which texture each shared material shows. Textured materials multiply the map by `color`. */
const TEXTURE_BINDINGS: readonly TextureBinding[] = [
  { material: 'arcadeScreenSnake', texture: 'attractSnake', color: arcadeScreenBaseColor('snake', true), fallbackColor: arcadeScreenBaseColor('snake', false) },
  { material: 'arcadeScreenMaze', texture: 'attractMaze', color: arcadeScreenBaseColor('maze', true), fallbackColor: arcadeScreenBaseColor('maze', false) },
  { material: 'arcadeScreenFrequency', texture: 'attractFrequency', color: arcadeScreenBaseColor('frequency', true), fallbackColor: arcadeScreenBaseColor('frequency', false) },
  { material: 'marqueeSnake', texture: 'marqueeSnake', color: '#ffffff', fallbackColor: '#1fa855' },
  { material: 'marqueeMaze', texture: 'marqueeMaze', color: '#ffffff', fallbackColor: '#c8203c' },
  { material: 'marqueeFrequency', texture: 'marqueeFrequency', color: '#ffffff', fallbackColor: '#16b8d4' },
  { material: 'signFace', texture: 'signFace', color: '#ffffff' },
  { material: 'posterSunset', texture: 'posterSunset', color: '#ffffff' },
  { material: 'posterReel', texture: 'posterReel', color: '#ffffff' },
  { material: 'shiftPoster', texture: 'shiftPoster', color: '#ffffff' },
  { material: 'shiftPlaque', texture: 'shiftPlaque', color: '#ffffff' },
  { material: 'floor', texture: 'floor', color: '#ffffff' },
  { material: 'wood', texture: 'wood', color: '#ffffff' },
  { material: 'woodDark', texture: 'woodDark', color: '#ffffff' },
  { material: 'crate', texture: 'crate', color: '#ffffff' },
  { material: 'crateSlat', texture: 'crate', color: '#b89c78' },
  { material: 'grille', texture: 'grille', color: '#ffffff' },
  { material: 'bookSpine', texture: 'spineAtlas', color: '#ffffff' },
  /** The wall colour stays a near-white multiplier owned by Memory_Shift, so no `color` here. */
  { material: 'wall', texture: 'wallPanel' },
  { material: 'rugWoven', texture: 'rugWoven', color: '#ffffff' },
  { material: 'cork', texture: 'corkBoard', color: '#ffffff' },
  { material: 'lampHalo', texture: 'lampGlow', color: '#ffffff' },
  /** Slightly dimmed multiplier: the reference card stays below the main CRT's brightness. */
  { material: 'smpteScreen', texture: 'smpteBars', color: '#b8b8b8' },
  { material: 'timecode', texture: 'timecode', color: '#ffffff' },
]

/**
 * Creates the textures (once) and attaches them to their materials. Idempotent and safe to call from
 * render: after disposeSharedResources() the next call rebuilds the textures. With no canvas support
 * nothing changes and every material keeps its flat colour.
 */
export function ensureSharedTextures(): void {
  for (const b of TEXTURE_BINDINGS) {
    const tex = getSharedTexture(b.texture)
    const mat = materials[b.material]
    if (!tex || mat.map === tex) continue
    mat.map = tex
    if (b.color) mat.color.set(b.color)
    mat.needsUpdate = true
  }
}

/** Number of live (created, not disposed) textures. */
export const liveTextureCount = (): number => registry.length

/** Test hook: replaces the canvas source (null restores the default) and drops existing textures. */
export function setCanvasFactory(factory: CanvasFactory | null): void {
  disposeTextures()
  canvasFactory = factory ?? defaultCanvasFactory
}

function disposeTextures(): void {
  for (const b of TEXTURE_BINDINGS) {
    const mat = materials[b.material]
    if (mat.map) {
      mat.map = null
      if (b.fallbackColor) mat.color.set(b.fallbackColor)
      mat.needsUpdate = true
    }
  }
  for (const t of registry) t.dispose()
  registry.length = 0
  cache.clear()
}

/** Every texture id, for tests and docs. */
export const SHARED_TEXTURE_IDS: readonly TextureId[] = TEXTURE_IDS

/** Disposes every shared geometry, material and texture. Call on scene unmount. Safe to call twice. */
export function disposeSharedResources(): void {
  for (const g of Object.values(geometries)) g.dispose()
  for (const g of spineGeometries) g.dispose()
  for (const g of wallGeometryCache.values()) g.dispose()
  wallGeometryCache.clear()
  for (const g of woodBoxCache.values()) g.dispose()
  woodBoxCache.clear()
  for (const m of Object.values(materials)) m.dispose()
  disposeTextures()
}
