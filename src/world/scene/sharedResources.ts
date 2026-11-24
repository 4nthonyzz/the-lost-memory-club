/**
 * Shared geometries and materials, created once and reused by every scene
 * component. No material reads lock state or memoryShifted; the Memory_Shift
 * driver mutates wall, screen and overlay materials from the blend progress.
 */
import {
  BoxGeometry,
  CanvasTexture,
  ClampToEdgeWrapping,
  CylinderGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshBasicMaterial,
  MeshLambertMaterial,
  NearestFilter,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  SphereGeometry,
} from 'three'
import { ROOM } from '../layout/roomLayout'
import { BASE_ARCADE_SCREEN_COLOR, BASE_CRT_SCREEN_COLOR, BASE_WALL_COLOR } from './memoryShift'
import {
  FLOOR_METRES_PER_REPEAT,
  TEXTURE_IDS,
  TEXTURE_SPECS,
  type Ctx2D,
  type TextureFilter,
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
  /** Fixed lit arcade marquee. */
  marquee: new MeshBasicMaterial({ color: '#f5a623' }),
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
  /** White base so per-instance colours show true. Used by the shelf tape InstancedMeshes. */
  tapeSpine: lambert('#ffffff'),
  /** 15.6 Arcade_Area dressing. Fixed colours. Sign face and lettering are emissive basic materials, not lights. */
  signBack: lambert('#1a1020'),
  signGlow: new MeshBasicMaterial({ color: '#2a0e2e' }),
  signText: new MeshBasicMaterial({ color: '#ffb347' }),
  /** 15.7: textured sign face (emissive basic material, not a light) and other new detail materials. */
  signFace: new MeshBasicMaterial({ color: '#2a0e2e' }),
  grille: lambert('#1c1d24'),
  deck: lambert('#22232a'),
  coinGlow: new MeshBasicMaterial({ color: '#ffcf5a' }),
  mug: lambert('#b4503c'),
  paper: lambert('#e6dfc6'),
  /** Powered-down screen and marquee of the companion cabinet and the CRT stack. */
  screenOff: lambert('#050508'),
  marqueeOff: lambert('#2a2018'),
  runner: lambert('#4a2a6a'),
  /** Screens: tinted only by the Memory_Shift blend. They never read lock state. */
  crtScreen: new MeshBasicMaterial({ color: BASE_CRT_SCREEN_COLOR }),
  arcadeScreen: new MeshBasicMaterial({ color: BASE_ARCADE_SCREEN_COLOR }),
  led: new MeshBasicMaterial({ color: '#ff4040' }),
  /** Memory_Shift set dressing, faded by opacity. */
  shiftPoster: overlay('#8a1c2e'),
  shiftPlaque: overlay('#2a0a14'),
}

/** Overlay materials with their full opacity, in the order the driver fades them. */
export const overlayMaterials = [
  { material: materials.shiftPoster, maxOpacity: 0.95 },
  { material: materials.shiftPlaque, maxOpacity: 0.95 },
]

// ---------------------------------------------------------------------------------------------
// Procedural canvas textures (task 15.7). Deterministic, drawn once, never redrawn per frame.
// Budget: 13 textures, about 4 MB estimated (see proceduralTextures.ts), limit 8 MB.
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
}

/** Which texture each shared material shows. Textured materials multiply the map by `color`. */
const TEXTURE_BINDINGS: readonly TextureBinding[] = [
  { material: 'arcadeScreen', texture: 'arcadeScreen' },
  { material: 'marquee', texture: 'marquee', color: '#ffffff' },
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
  { material: 'deck', texture: 'deck', color: '#ffffff' },
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
  for (const m of Object.values(materials)) m.dispose()
  disposeTextures()
}
