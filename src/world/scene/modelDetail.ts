/**
 * Pure part declarations for the procedural 1990s models (task 13.6). Every object is a list of
 * primitive Parts (box, plane, cylinder, low-segment cylinder, low-segment sphere) derived only
 * from layout footprints and heights. Nothing here imports three.js at runtime, so the triangle
 * estimate, draw-call estimate and layout checks run in plain node tests.
 *
 * Layout stays the single source of truth: parts decorate footprints and anchors from
 * `roomLayout.ts`. They never create or change Colliders.
 */
import { ROOM } from '../layout/roomLayout'
import type { Aabb, ArcadeGameKind } from '../worldTypes'
import { facingFrame } from './assetPlacement'
import {
  BOX_FACE_FRONT,
  CABINET_CARD_M,
  CABINET_DETAIL_REGIONS,
  CABINET_PLAIN_V,
  DESK_DETAIL_ASPECT,
  DESK_DETAIL_TILE_M,
  TEXTURE_IDS,
  VCR_TILE_ASPECT,
  detailUvRect,
  totalTextureMemoryBytes,
  type UvRect,
} from './proceduralTextures'
import { SHELF_IDS, shelfContents, shelfFrameParts } from './shelfModel'
import type { geometries, materials } from './sharedResources'

export type GeometryKey = keyof typeof geometries
export type MaterialKey = keyof typeof materials
export type Vec3 = readonly [number, number, number]

export interface Part {
  geo: GeometryKey
  mat: MaterialKey
  pos: Vec3
  scale: Vec3
  /** Euler XYZ radians. */
  rot?: Vec3
  /**
   * Wood board with metric UVs (task 19.2): `scale` is the real size, rendered from a cached real-size
   * box geometry (mesh scale 1) so the grain tiles per metre. Boards of equal size share one draw call.
   */
  metric?: boolean
  /**
   * Upholstery box with metric UVs (task 21.1): like `metric`, but without the grain alignment, and the
   * texture repeats once per FABRIC_METRES_PER_REPEAT metres. Real-size geometry, mesh scale 1.
   */
  metricFabric?: boolean
  /**
   * Metric UVs with an explicit tile size (task 21.2): real-size box, mesh scale 1, and the texture repeats
   * once per `metricRepeat` metres (plain, not grain-aligned). Used by the CRT casing, whose tile is one
   * front-face width.
   */
  metricRepeat?: number
  /**
   * Tile height over tile width for a non-square texture used with metricRepeat (task 22.1): the vcrDeck is
   * 256 x 128, so its aspect is 0.5 and a px covers the same metres in both axes. Default 1.
   */
  metricAspect?: number
  /**
   * UV origin shift in metres (task 22.2), added to the in-plane face coordinates (a, b) before dividing by the repeat. Lets a part show a chosen
   * region of a shared tile: a drawer of the filing-cabinet front. Needs metricRepeat.
   */
  metricOffset?: readonly [number, number]
  /**
   * With metricOffset (task 22.2): v range of a plain-steel stripe of the tile. Every face except +-z then shows only that stripe, so
   * the sides, top and thin strips of a cabinet never show cards or seams. Used by the filing cabinets.
   */
  metricPlainV?: readonly [number, number]
  /**
   * Atlas window (task 27.1): real-size box (mesh scale 1) whose `faces` (BoxGeometry face indices, +z = 4) show the UV rectangle
   * `rect` of cabinetAndManualDetail and whose other faces show the flat `plain` rectangle. Zero extra triangles.
   */
  atlas?: { rect: UvRect; faces: readonly number[]; plain: UvRect }
  /**
   * Desk lamp role (task 23.1): `bulb` core, `inner` shade face, `sprite` (a camera-facing glow plane, drawn by Props.tsx
   * with a billboard) or the desk light `pool`. Sprite and pool use a never-drawn material while the lamp is off.
   */
  lampRole?: 'bulb' | 'inner' | 'sprite' | 'pool' | 'cone' | 'shade' | 'liner'
}

/** True when the part is rendered from a cached real-size geometry (mesh scale 1). */
export const isRealSizePart = (p: Part): boolean => Boolean(p.metric || p.metricFabric || p.metricRepeat || p.atlas)

/** Draw-call group of a part: geometry + material, plus the board size and the UV mapping for metric parts. */
export function partGroupKey(p: Part): string {
  if (!isRealSizePart(p)) return `${p.geo}|${p.mat}`
  const size = p.scale.map((v) => Math.round(v * 1e4)).join(',')
  const aspect = p.metricAspect && p.metricAspect !== 1 ? `|a${p.metricAspect}` : ''
  const offset = p.metricOffset ? `|o${p.metricOffset.map((v) => Math.round(v * 1e4)).join(',')}` : ''
  const atlas = p.atlas ? `|w${p.atlas.rect.u0.toFixed(5)},${p.atlas.rect.v0.toFixed(5)}|f${p.atlas.faces.join('.')}` : ''
  return `${p.geo}|${p.mat}|${size}${aspect}${offset}${atlas}`
}

/**
 * Box whose +z (front) face shows `region` of cabinetAndManualDetail and whose other faces show the flat `plain` stripe (task 27.1).
 * The cabinet parts are built in a local frame whose front is +z, so +z is the player-facing face after the Faced group rotates it.
 */
const atlasFront = (mat: MaterialKey, pos: Vec3, scale: Vec3, region: 'door' | 'lip' | 'kick', plain: 'plainSteel' | 'plainDark'): Part => ({
  ...bx(mat, pos, scale),
  atlas: { rect: detailUvRect(CABINET_DETAIL_REGIONS[region]), faces: [BOX_FACE_FRONT], plain: detailUvRect(CABINET_DETAIL_REGIONS[plain]) },
})

/** Triangles per shared unit geometry. A test checks these against the real three.js geometries. */
export const GEOMETRY_TRIANGLES: Readonly<Record<GeometryKey, number>> = {
  box: 12,
  plane: 2,
  cylinder: 48, // 12 radial segments: 24 side + 24 caps
  cylinderLow: 32, // 8 radial segments: 16 side + 16 caps
  sphere: 80, // 8 x 6 segments
  cone: 24, // open truncated cone, 12 radial segments, no caps
  collar: 8, // open square tube (4 radial segments, no caps): the banker's lamp brass end caps (25.1)
  disc: 24, // 24-segment circle: lamp halo, desk pool and the table lamp's inner glow (30.1)
  lampCone: 48, // open truncated cone, 24 radial segments, no caps: the volumetric lamp light (30.1)
}

export const SCENE_TRIANGLE_BUDGET = 20000
export const MAX_LIGHTS = 4

const HALF_PI = Math.PI / 2

const part = (geo: GeometryKey, mat: MaterialKey, pos: Vec3, scale: Vec3, rot?: Vec3): Part =>
  rot ? { geo, mat, pos, scale, rot } : { geo, mat, pos, scale }
const bx = (mat: MaterialKey, pos: Vec3, scale: Vec3, rot?: Vec3) => part('box', mat, pos, scale, rot)
/**
 * VHS cassette box (task 22.1): real-size box on a vhsShell-mapped material (tapeBlack or tapeBlue). One texture tile spans the
 * cassette length (x), so the reels window, label and flap sit on the top face undistorted and the ribs on the sides.
 */
const tape = (mat: 'tapeBlack' | 'tapeBlue', pos: Vec3, scale: Vec3, rot?: Vec3): Part => ({ ...bx(mat, pos, scale, rot), metricRepeat: scale[0] })
/** Unrotated wood board with metric UVs (long boards: grain tiles instead of stretching). */
const wd = (mat: 'wood' | 'woodDark', pos: Vec3, scale: Vec3): Part => ({ geo: 'box', mat, pos, scale, metric: true })

function offset(parts: readonly Part[], o: Vec3): Part[] {
  return parts.map((p) => ({ ...p, pos: [p.pos[0] + o[0], p.pos[1] + o[1], p.pos[2] + o[2]] as const }))
}

/** Rotates local parts about the X axis through `pivot` (children must not carry their own rotation). */
function tiltX(parts: readonly Part[], pivot: Vec3, angle: number): Part[] {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return parts.map((p) => {
    if (p.rot) throw new Error('tiltX children must not rotate')
    const [x, y, z] = p.pos
    return {
      ...p,
      pos: [pivot[0] + x, pivot[1] + y * c - z * s, pivot[2] + y * s + z * c] as const,
      rot: [angle, 0, 0] as const,
    }
  })
}

const centre = (b: Aabb) => ({ cx: (b.minX + b.maxX) / 2, cz: (b.minZ + b.maxZ) / 2, w: b.maxX - b.minX, d: b.maxZ - b.minZ })

// ---------------------------------------------------------------------------------------------
// Media console island: CRT, VCR, tapes and reference monitor (station "crt-vhs"; front faces +z at box.maxZ)
// ---------------------------------------------------------------------------------------------

/** Top of the media console, and the Y where the television casing starts. */
export const CONSOLE_TOP = 0.7
export const CRT_Y0 = CONSOLE_TOP

/** Television footprint on the console: width, x offset from the console centre, and recess from the front face. */
const CRT_W = 0.9
const CRT_DX = 0
const CRT_RECESS = 0.05

/** World (or local) placement of the television in the frame of `box`: centre x and the z of its front face. */
function crtFrame(box: Aabb) {
  const { cx } = centre(box)
  return { cx: cx + CRT_DX, front: box.maxZ - CRT_RECESS, w: CRT_W }
}

/** Fixed emissive CRT screen rectangle. Effects.tsx crtScreenPlacement() adds only a small z nudge. */
export function crtScreenRect(box: Aabb, height: number) {
  const f = crtFrame(box)
  const h = height - CRT_Y0
  return {
    position: [f.cx - 0.05, CRT_Y0 + h / 2, f.front + 0.005] as const,
    scale: [f.w * 0.6, h * 0.7, 1] as const,
  }
}

/** Television shell: real-size box on the crtCasing material, one texture tile per shell width. */
const crtShell = (pos: Vec3, scale: Vec3): Part => ({ ...bx('crtCasing', pos, scale), metricRepeat: scale[0] })

/** `box` is the console footprint; the television sits on top of it, centred on the console. */
export function crtTelevisionParts(box: Aabb, height: number): Part[] {
  const f = crtFrame(box)
  const w = f.w
  const h = height - CRT_Y0
  const cy = CRT_Y0 + h / 2
  const top = CRT_Y0 + h
  const sx = -0.05
  const sw = w * 0.6
  const sh = h * 0.7
  const t = 0.05
  const local: Part[] = [
    // Stepped casing: front shell, narrower middle shell, tapered tube. The two shells use the crtCasing
    // material with metric UVs; one texture tile spans the shell width, so the front face (aspect about
    // 1.41:1) shows the lower 71% of the tile (canvas y 74..256) undistorted.
    crtShell([0, cy, -0.07], [w * 0.94, h, 0.14]),
    crtShell([0, cy, -0.21], [w * 0.84, h * 0.9, 0.14]),
    bx('casingDark', [0, cy - 0.02, -0.38], [w * 0.6, h * 0.66, 0.2]),
    // Raised bezel frame around the screen, so the screen reads as recessed.
    bx('bezel', [sx, cy + sh / 2 + t / 2, 0.015], [sw + 2 * t, t, 0.03]),
    bx('bezel', [sx, cy - sh / 2 - t / 2, 0.015], [sw + 2 * t, t, 0.03]),
    bx('bezel', [sx - sw / 2 - t / 2, cy, 0.015], [t, sh, 0.03]),
    bx('bezel', [sx + sw / 2 + t / 2, cy, 0.015], [t, sh, 0.03]),
    // Fixed emissive screen on the shared crtScreen material (tinted only by Memory_Shift).
    part('plane', 'crtScreen', [sx, cy, 0.005], [sw, sh, 1]),
    // Two knobs, speaker slits, power LED and badge on the right strip.
    part('cylinderLow', 'metal', [0.385, cy + 0.15, 0.012], [0.06, 0.025, 0.06], [HALF_PI, 0, 0]),
    part('cylinderLow', 'metal', [0.385, cy + 0.05, 0.012], [0.06, 0.025, 0.06], [HALF_PI, 0, 0]),
    bx('grille', [0.385, cy - 0.15, 0.003], [0.1, 0.14, 0.006]),
    part('cylinderLow', 'led', [0.4, cy - 0.26, 0.006], [0.02, 0.012, 0.02], [HALF_PI, 0, 0]),
    bx('metal', [sx, cy - 0.28, 0.003], [0.1, 0.014, 0.006]),
    // Antenna stubs.
    part('cylinderLow', 'metal', [0, top + 0.015, -0.3], [0.08, 0.03, 0.08]),
    part('cylinderLow', 'metal', [0.07, top + 0.173, -0.3], [0.012, 0.32, 0.012], [0, 0, -0.45]),
    part('cylinderLow', 'metal', [-0.07, top + 0.173, -0.3], [0.012, 0.32, 0.012], [0, 0, 0.45]),
  ]
  return offset(local, [f.cx, 0, f.front])
}

/** Inner geometry of the console shared by the body, the VCR bay and the tape stacks. */
const CONSOLE_PANEL = 0.04
const SHELF_Y = 0.3
const BAY_RIGHT_DX = 0.25 // x of the divider between the VCR bay and the cabinet, from the console centre

/**
 * Wide 1990s wooden media console: plinth, end panels, top slab, back, a divider that closes a VCR bay on
 * the left (lower shelf at 0.3 m) and a two-door cabinet on the right. Front faces +Z at box.maxZ.
 */
export function mediaConsoleParts(box: Aabb): Part[] {
  const { cx, cz, w, d } = centre(box)
  const f = box.maxZ
  const bodyH = CONSOLE_TOP - 0.02
  const doorW = (w / 2 - BAY_RIGHT_DX - CONSOLE_PANEL) / 2 - 0.01
  const doorX = cx + BAY_RIGHT_DX + CONSOLE_PANEL / 2 + 0.005 + doorW / 2
  return [
    bx('woodDark', [cx, 0.04, cz], [w - 0.04, 0.08, d - 0.04]),
    bx('wood', [box.minX + CONSOLE_PANEL / 2, 0.38, cz], [CONSOLE_PANEL, 0.6, d]),
    bx('wood', [box.maxX - CONSOLE_PANEL / 2, 0.38, cz], [CONSOLE_PANEL, 0.6, d]),
    bx('woodDark', [cx, 0.38, box.minZ + 0.01], [w - 0.08, 0.6, 0.02]),
    wd('wood', [cx, bodyH, cz], [w + 0.06, 0.04, d + 0.04]),
    bx('wood', [cx + BAY_RIGHT_DX, 0.38, cz], [CONSOLE_PANEL, 0.6, d - 0.04]),
    // Lower shelf of the VCR bay and the dark bay interior behind it.
    bx('wood', [cx + (BAY_RIGHT_DX - w / 2) / 2, SHELF_Y, cz], [BAY_RIGHT_DX + w / 2 - 2 * CONSOLE_PANEL, 0.03, d - 0.04]),
    // Two cabinet doors with handles.
    bx('woodDark', [doorX, 0.36, f + 0.004], [doorW, 0.56, 0.012]),
    bx('woodDark', [doorX + doorW + 0.02, 0.36, f + 0.004], [doorW, 0.56, 0.012]),
    bx('metal', [doorX + doorW / 2 - 0.04, 0.4, f + 0.016], [0.015, 0.1, 0.015]),
    bx('metal', [doorX + doorW / 2 + 0.06, 0.4, f + 0.016], [0.015, 0.1, 0.015]),
  ]
}

/** VCR on the console's lower shelf: front slot, partly inserted cassette, buttons, display strip, LED. */
export function vcrDeckParts(box: Aabb): Part[] {
  const { cx, cz, w, d } = centre(box)
  const vw = 0.62
  const vcx = cx + (BAY_RIGHT_DX - w / 2) / 2 - 0.08
  const front = cz + d / 2 - 0.06
  const y = SHELF_Y + 0.015 + 0.05
  const zf = front + 0.003
  return [
    // Housing on the vcrDeck material: one tile is the VCR width (0.62 m) by half that (the texture is 2:1), so the front
    // face (0.1 m tall) shows the bottom 41 rows with the button labels and the HI-FI STEREO marking undistorted.
    { ...bx('vcrDeck', [vcx, y, front - 0.19], [vw, 0.1, 0.38]), metricRepeat: vw, metricAspect: VCR_TILE_ASPECT },
    bx('bezel', [vcx - 0.12, y + 0.005, zf], [0.28, 0.04, 0.006]),
    tape('tapeBlack', [vcx - 0.12, y + 0.005, front - 0.045], [0.19, 0.026, 0.104]),
    bx('tapeLabel', [vcx - 0.12, y + 0.0185, front - 0.02], [0.1, 0.002, 0.03]),
    ...[0, 1, 2, 3].map((i) => bx('metal', [vcx + 0.08 + i * 0.045, y - 0.015, zf + 0.002], [0.035, 0.02, 0.01])),
    // Metallic tape slot: a top rail, a bottom rail and a thin flap in front of the dark slot opening.
    bx('tapeSlotMetal', [vcx - 0.12, y + 0.0275, zf + 0.003], [0.3, 0.006, 0.008]),
    bx('tapeSlotMetal', [vcx - 0.12, y - 0.0175, zf + 0.003], [0.3, 0.006, 0.008]),
    bx('tapeSlotMetal', [vcx - 0.12, y + 0.0215, zf + 0.0035], [0.26, 0.007, 0.004]),
    // Timecode window: dark recess with the glowing green readout plane (00:19:96) in front of it.
    bx('bezel', [vcx + 0.22, y + 0.02, zf + 0.002], [0.09, 0.03, 0.008]),
    part('plane', 'timecode', [vcx + 0.22, y + 0.02, zf + 0.0066], [0.08, 0.02, 1]),
    part('cylinderLow', 'led', [vcx + 0.26, y - 0.015, zf + 0.002], [0.015, 0.01, 0.015], [HALF_PI, 0, 0]),
  ]
}

/** Stacked VHS tapes: one stack on the console top, one on the VCR shelf next to the VCR. */
export function consoleTapeParts(box: Aabb): Part[] {
  const { cx, cz, d } = centre(box)
  const parts: Part[] = []
  const stack = (x: number, z: number, y0: number, n: number, rotY: number) => {
    for (let i = 0; i < n; i++) {
      parts.push(tape(i % 2 ? 'tapeBlue' : 'tapeBlack', [x, y0 + 0.015 + i * 0.03, z], [0.19, 0.03, 0.1], [0, rotY * (i % 2 ? -1 : 1), 0]))
    }
    parts.push(bx('tapeLabel', [x, y0 + 0.03 * n + 0.001, z], [0.1, 0.002, 0.06]))
  }
  stack(cx - 0.66, cz + d / 2 - 0.2, CONSOLE_TOP, 4, 0.12)
  stack(cx + BAY_RIGHT_DX - 0.17, cz + d / 2 - 0.2, SHELF_Y + 0.015, 3, 0.1)
  return parts
}

/** Small secondary reference monitor on the right end of the console top. Own dim screen, not the shared crtScreen. */
export function referenceMonitorParts(box: Aabb): Part[] {
  const { cx, cz, w, d } = centre(box)
  const mx = cx + w / 2 - 0.2
  const mw = 0.34
  const mh = 0.28
  const y0 = CONSOLE_TOP
  const front = cz + d / 2 - 0.12
  return [
    // Housing on the dark molded crtCasing material (same look as the main television); one tile spans the monitor width.
    { ...bx('crtCasing', [mx, y0 + mh / 2, front - 0.1], [mw, mh, 0.2]), metricRepeat: mw },
    bx('casingDark', [mx, y0 + mh / 2 + 0.01, front - 0.26], [mw * 0.6, mh * 0.7, 0.14]),
    bx('bezel', [mx, y0 + mh / 2, front + 0.002], [mw * 0.86, mh * 0.82, 0.006]),
    part('plane', 'smpteScreen', [mx, y0 + mh / 2, front + 0.006], [mw * 0.74, mh * 0.66, 1]),
    part('cylinderLow', 'led', [mx + mw * 0.38, y0 + 0.03, front + 0.003], [0.015, 0.01, 0.015], [HALF_PI, 0, 0]),
  ]
}

/** Corner-cutting smoothing (one Chaikin pass): keeps the end points and never leaves the control polygon. */
function smoothPath(pts: readonly Vec3[]): Vec3[] {
  const out: Vec3[] = [pts[0]]
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    out.push(
      [0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1], 0.75 * a[2] + 0.25 * b[2]],
      [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1], 0.25 * a[2] + 0.75 * b[2]],
    )
  }
  out.push(pts[pts.length - 1])
  return out
}

/**
 * One round cable as low-segment cylinders (8 sides) along a smoothed path. A cylinder's axis is Y; Euler XYZ
 * (Rx * Ry * Rz) first tilts it by gamma about Z, then turns it by beta about Y so the axis follows the segment.
 * Each cylinder is a little longer than its segment so bends leave no gaps.
 */
export function cablePathParts(path: readonly Vec3[], mat: MaterialKey, thick: number): Part[] {
  const pts = smoothPath(path)
  const parts: Part[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const dz = b[2] - a[2]
    const len = Math.hypot(dx, dy, dz)
    if (len < 1e-6) continue
    const s = Math.hypot(dx, dz) / len
    const gamma = Math.acos(Math.max(-1, Math.min(1, dy / len)))
    const beta = s < 1e-9 ? 0 : Math.atan2(dz / len, -dx / len)
    parts.push(part('cylinderLow', mat, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [thick, len + thick * 0.5, thick], [0, beta, gamma]))
  }
  return parts
}

/**
 * Coaxial and power cables of the media console (task 19.2): a black VCR to TV coax, a grey TV to reference
 * monitor coax along the console top, a red power cable from the monitor and a black TV power cable. The
 * three that leave the top run over the back edge of the slab and down the back panel, a few centimetres
 * behind it. All stay within 5 cm of the console footprint. Shapes derive from the footprint only.
 */
export function consoleCableParts(box: Aabb): Part[] {
  const { cx } = centre(box)
  const z0 = box.minZ
  const p = (dx: number, y: number, dz: number): Vec3 => [cx + dx, y, z0 + dz]
  return [
    ...cablePathParts([p(-0.15, 0.76, 0.075), p(-0.5, 0.725, 0), p(-0.5, 0.69, -0.03), p(-0.5, 0.2, -0.025), p(-0.45, 0.06, -0.02)], 'cableBlack', 0.018),
    ...cablePathParts([p(0.15, 0.77, 0.075), p(0.28, 0.73, 0.1), p(0.45, 0.728, 0.13), p(0.6, 0.77, 0.152)], 'cableGrey', 0.016),
    ...cablePathParts([p(0.77, 0.82, 0.152), p(0.82, 0.725, 0.04), p(0.82, 0.69, -0.03), p(0.82, 0.3, -0.03), p(0.7, 0.04, -0.02)], 'cableRed', 0.018),
    ...cablePathParts([p(0, 0.74, 0.075), p(0.05, 0.72, 0), p(0.05, 0.69, -0.03), p(0.05, 0.3, -0.03), p(0.3, 0.04, -0.02)], 'cableBlack', 0.018),
  ]
}

export const FILING_DRAWERS = 4

/**
 * Metal filing cabinet, front on +Z (task 18.3): plinth, body, an overhanging top lip, and four drawers.
 * Each drawer face sits behind a raised four-strip frame (so it reads as recessed), with a dark gap
 * outline, a round-bar pull on two posts, a bright label slot and a paper label with an ink line.
 * `variant` 1 uses a warmer grey, so two cabinets side by side do not look identical.
 */
export function filingCabinetParts(box: Aabb, height: number, variant = 0): Part[] {
  const { cx, cz, w, d } = centre(box)
  const f = box.maxZ
  const body: MaterialKey = variant === 0 ? 'filingGrey' : 'filingGreyB'
  const face: MaterialKey = variant === 0 ? 'filingDark' : 'filingDarkB'
  const base = 0.06
  const lip = 0.03
  const bodyH = height - lip - base
  // metalCabinet mapping (task 22.2): one tile spans the cabinet body front, so repeat = body width and the aspect makes the tile
  // as tall as the body (the four 64-row bands of the texture are exactly the four drawers: band i spans v i/4..(i+1)/4).
  // A part's metricOffset is its lower-left front corner relative to the body's lower-left front corner, in metres.
  const tileX0 = cx - w / 2
  const aspect = bodyH / w
  const mapped = (mat: MaterialKey, pos: Vec3, scale: Vec3): Part => ({
    ...bx(mat, pos, scale),
    metricRepeat: w,
    metricAspect: aspect,
    metricOffset: [pos[0] - scale[0] / 2 - tileX0, pos[1] - scale[1] / 2 - base],
    metricPlainV: CABINET_PLAIN_V,
  })
  // Thin frame strips show only plain steel: a taller tile (aspect x 6) squeezes the strip into the plain stripe of the texture.
  const STRIP_STRETCH = 6
  const strip = (pos: Vec3, scale: Vec3): Part => ({
    ...bx(body, pos, scale),
    metricRepeat: w,
    metricAspect: aspect * STRIP_STRETCH,
    metricOffset: [0, CABINET_PLAIN_V[0] * STRIP_STRETCH * bodyH],
    metricPlainV: CABINET_PLAIN_V,
  })
  const parts: Part[] = [
    bx('bezel', [cx, base / 2, cz], [w - 0.04, base, d - 0.04]),
    mapped(body, [cx, (height - lip + base) / 2, cz], [w, bodyH, d]),
    // The top lip starts exactly one tile above the body bottom, so it wraps onto the plain bottom rows of the texture.
    mapped(body, [cx, height - lip / 2, cz + 0.005], [w + 0.02, lip, d + 0.03]),
  ]
  const pitch = bodyH / FILING_DRAWERS
  const fw = w - 0.03
  const fh = pitch - 0.012
  const s = 0.012
  for (let i = 0; i < FILING_DRAWERS; i++) {
    const y = base + pitch * (i + 0.5)
    parts.push(
      // Dark gap outline, then the recessed drawer face (shows its band of the tile), then the raised frame strips around it.
      bx('bezel', [cx, y, f + 0.001], [fw, fh, 0.002]),
      mapped(face, [cx, y, f + 0.004], [fw - 2 * s, fh - 2 * s, 0.004]),
      strip([cx, y + fh / 2 - s / 2, f + 0.006], [fw, s, 0.012]),
      strip([cx, y - fh / 2 + s / 2, f + 0.006], [fw, s, 0.012]),
      strip([cx - fw / 2 + s / 2, y, f + 0.006], [s, fh - 2 * s, 0.012]),
      strip([cx + fw / 2 - s / 2, y, f + 0.006], [s, fh - 2 * s, 0.012]),
      // Chrome label slot (kept as geometry) and a typed index card that shows its card cell of the tile. The texture
      // draws the larger chrome frame around them (CABINET_FRAME_M); the old ink line is gone, the typed text replaces it.
      bx('labelSlot', [cx, y + fh * 0.27, f + 0.007], [0.25, 0.075, 0.004]),
      mapped('filingCard', [cx, y + fh * 0.27, f + 0.0095], [CABINET_CARD_M.w, CABINET_CARD_M.h, 0.002]),
      // Pull: horizontal bar on two posts.
      part('cylinderLow', 'metal', [cx, y - fh * 0.14, f + 0.034], [0.02, 0.16, 0.02], [0, 0, HALF_PI]),
      bx('metal', [cx - 0.07, y - fh * 0.14, f + 0.018], [0.012, 0.012, 0.028]),
      bx('metal', [cx + 0.07, y - fh * 0.14, f + 0.018], [0.012, 0.012, 0.028]),
    )
  }
  return parts
}

/**
 * Wall-mounted cork bulletin board on the north wall facing +Z (task 18.3): a dark backing, the cork
 * texture plane (pinned cards, Polaroids, notes, red string) and a four-piece wooden frame.
 * Everything stays within 0.075 m of the wall.
 */
export function bulletinBoardParts(): Part[] {
  const p = layoutProp('bulletin-board')
  const el = p.elevation ?? 0
  const { cx, w } = centre(p.box)
  const h = p.height
  const cy = el + h / 2
  const z = p.box.maxZ
  const t = 0.05
  return [
    bx('woodDark', [cx, cy, z - 0.02], [w, h, 0.04]),
    part('plane', 'cork', [cx, cy, z + 0.004], [w - 2 * t, h - 2 * t, 1]),
    bx('wood', [cx, el + h - t / 2, z + 0.01], [w, t, 0.03]),
    bx('wood', [cx, el + t / 2, z + 0.01], [w, t, 0.03]),
    bx('wood', [cx - w / 2 + t / 2, cy, z + 0.01], [t, h - 2 * t, 0.03]),
    bx('wood', [cx + w / 2 - t / 2, cy, z + 0.01], [t, h - 2 * t, 0.03]),
  ]
}

export const ARCHIVE_BOX_IDS = ['archive-boxes-nw', 'archive-boxes-ne', 'archive-boxes-sw'] as const

/**
 * Archival tape boxes in a corner (task 18.3): a large cardboard box, a smaller rotated box on top and a
 * third box beside them, each with packing-tape strips and a paper label with an ink line, plus two small
 * tape stacks (on the top box and on the floor). Everything stays inside the layout footprint and height.
 */
export function archiveBoxParts(box: Aabb, height: number): Part[] {
  const { cx, cz, w, d } = centre(box)
  const parts: Part[] = []
  const cardboardBox = (x: number, z: number, y0: number, bw: number, bh: number, bd: number, yaw: number) => {
    const rot: Vec3 | undefined = yaw ? [0, yaw, 0] : undefined
    const cs = Math.cos(yaw)
    const sn = Math.sin(yaw)
    // Local offsets (lx, lz) rotated about Y by the box yaw.
    const at = (lx: number, ly: number, lz: number): Vec3 => [x + lx * cs + lz * sn, y0 + ly, z - lx * sn + lz * cs]
    parts.push(
      // Corrugated cardboard texture (task 22.2): one tile spans the box width, so the label, tape band and stencil keep their
      // proportions. Only the lower half of the tile (v 0..0.5) is visible on the smallest box, where every decal sits.
      { ...bx('cardboard', [x, y0 + bh / 2, z], [bw, bh, bd], rot), metricRepeat: bw },
      bx('cardboardDark', at(0, bh + 0.002, 0), [0.05, 0.004, bd], rot),
      bx('cardboardDark', at(0, bh * 0.5, bd / 2 + 0.001), [0.05, bh, 0.003], rot),
      bx('tapeLabel', at(bw * 0.2, bh * 0.55, bd / 2 + 0.002), [bw * 0.4, bh * 0.28, 0.004], rot),
      bx('bezel', at(bw * 0.2, bh * 0.55, bd / 2 + 0.0045), [bw * 0.28, 0.006, 0.002], rot),
    )
  }
  const bigH = height * 0.5
  const midH = height * 0.3
  const stackH = height - bigH - midH
  cardboardBox(cx - w * 0.18, cz - d * 0.12, 0, w * 0.55, bigH, d * 0.7, 0)
  cardboardBox(cx - w * 0.18, cz - d * 0.12, bigH, w * 0.4, midH, d * 0.5, 0.25)
  cardboardBox(cx + w * 0.26, cz + d * 0.28, 0, w * 0.3, height * 0.34, d * 0.35, -0.3)
  // Two small stacks of loose tapes: one on top of the stack, one on the floor.
  const tapeStack = (x: number, z: number, y0: number, n: number, yaw: number) => {
    for (let i = 0; i < n; i++) parts.push(tape(i % 2 ? 'tapeBlue' : 'tapeBlack', [x, y0 + 0.012 + i * 0.024, z], [0.1, 0.024, 0.052], [0, yaw, 0]))
  }
  tapeStack(cx - w * 0.18, cz - d * 0.12, bigH + midH, Math.max(1, Math.floor(stackH / 0.024)), 0.25)
  tapeStack(cx + w * 0.26, cz - d * 0.25, 0, 2, 0.4)
  return parts
}

// ---------------------------------------------------------------------------------------------
// Task 18.3 room dressing: conduit, vents, cable loops, corner posts, wall clock, lamp
// ---------------------------------------------------------------------------------------------

/** Main-room interior box (walls[2] west and walls[3] east segment bound it in x). */
export function mainRoomBox(): Aabb {
  return { minX: ROOM.walls[2].maxX, maxX: ROOM.walls[3].minX, minZ: ROOM.bounds.minZ, maxZ: ROOM.bounds.maxZ }
}

/** Wall-mounted dressing may protrude at most this far from the wall face. */
export const WALL_PROTRUSION_LIMIT = 0.15
const CONDUIT_D = 0.06
const CONDUIT_Y = ROOM.height - 0.2
/** x of the vertical conduit drop to the junction box on the north wall. */
const CONDUIT_DROP_X = 3

/**
 * Overhead metal conduit: a run along the north wall and one along the west wall just under the crown
 * trim, elbow spheres at the corner and at the drop, a vertical drop to a junction box with a status LED,
 * and bracket clamps. Everything hugs the walls (at most 0.09 m out) and never touches a Collider.
 */
export function conduitParts(): Part[] {
  const r = mainRoomBox()
  const zN = r.minZ + 0.06
  const xW = r.minX + 0.06
  const parts: Part[] = []
  // North run, axis along X.
  const nLen = r.maxX - r.minX - 0.24
  parts.push(part('cylinderLow', 'conduit', [(r.minX + r.maxX) / 2, CONDUIT_Y, zN], [CONDUIT_D, nLen, CONDUIT_D], [0, 0, HALF_PI]))
  // West run, axis along Z.
  const wLen = r.maxZ - r.minZ - 0.24
  parts.push(part('cylinderLow', 'conduit', [xW, CONDUIT_Y, (r.minZ + r.maxZ) / 2], [CONDUIT_D, wLen, CONDUIT_D], [HALF_PI, 0, 0]))
  // Elbows.
  parts.push(
    part('sphere', 'conduit', [xW, CONDUIT_Y, zN], [0.08, 0.08, 0.08]),
    part('sphere', 'conduit', [CONDUIT_DROP_X, CONDUIT_Y, zN], [0.08, 0.08, 0.08]),
  )
  // Drop and junction box (cover plate and LED on its front).
  const dropBottom = 1.95
  parts.push(part('cylinderLow', 'conduit', [CONDUIT_DROP_X, (CONDUIT_Y + dropBottom) / 2, zN], [CONDUIT_D, CONDUIT_Y - dropBottom, CONDUIT_D]))
  parts.push(
    bx('metal', [CONDUIT_DROP_X, dropBottom - 0.1, r.minZ + 0.05], [0.2, 0.2, 0.1]),
    bx('conduit', [CONDUIT_DROP_X, dropBottom - 0.1, r.minZ + 0.105], [0.16, 0.16, 0.012]),
    part('cylinderLow', 'led', [CONDUIT_DROP_X + 0.05, dropBottom - 0.05, r.minZ + 0.114], [0.02, 0.01, 0.02], [HALF_PI, 0, 0]),
  )
  // Bracket clamps: straddling the pipe, a little thicker than it.
  for (const x of [-4, -2, 0, 2, 4]) parts.push(bx('metal', [x, CONDUIT_Y, r.minZ + 0.045], [0.04, 0.09, 0.07]))
  for (const z of [-3, -1, 1, 3]) parts.push(bx('metal', [r.minX + 0.045, CONDUIT_Y, z], [0.07, 0.09, 0.04]))
  for (const y of [2.5, 2.15]) parts.push(bx('metal', [CONDUIT_DROP_X, y, r.minZ + 0.045], [0.09, 0.04, 0.07]))
  return parts
}

/** Ceiling ventilation grille (louvred box using the grille texture) and a smaller high wall grille on the south wall. */
export function ventilationParts(): Part[] {
  const r = mainRoomBox()
  const y = ROOM.height
  const vx = 0
  const vz = -2.5
  const parts: Part[] = [
    bx('metal', [vx, y - 0.04, vz], [0.9, 0.08, 0.6]),
    bx('grille', [vx, y - 0.083, vz], [0.8, 0.006, 0.5]),
  ]
  // Five angled louvre slats under the grille face.
  for (let i = 0; i < 5; i++) parts.push(bx('metal', [vx, y - 0.092, vz - 0.2 + i * 0.1], [0.78, 0.008, 0.05], [0.5, 0, 0]))
  // High wall grille on the south wall: frame plus textured face, 0.06 m deep at most.
  const wx = -3
  const wy = 2.45
  parts.push(
    bx('metal', [wx, wy, r.maxZ - 0.02], [0.7, 0.4, 0.04]),
    bx('grille', [wx, wy, r.maxZ - 0.05], [0.6, 0.3, 0.02]),
  )
  return parts
}

const CABLE_THICK = 0.025

/**
 * A hanging cable loop between two ceiling clamps: `segs` straight box segments along a parabola that
 * sags by `sag` metres at the middle. Segment boxes are oriented with Euler XYZ (pitch about Z first, then yaw about Y).
 */
export function cableLoopParts(a: readonly [number, number], b: readonly [number, number], sag: number, segs = 8): Part[] {
  const y0 = ROOM.height - 0.05
  const pts = Array.from({ length: segs + 1 }, (_, i) => {
    const s = i / segs
    return [a[0] + (b[0] - a[0]) * s, y0 - sag * 4 * s * (1 - s), a[1] + (b[1] - a[1]) * s] as const
  })
  const parts: Part[] = []
  for (let i = 0; i < segs; i++) {
    const [x0, yy0, z0] = pts[i]
    const [x1, yy1, z1] = pts[i + 1]
    const dx = x1 - x0
    const dy = yy1 - yy0
    const dz = z1 - z0
    const len = Math.hypot(dx, dy, dz)
    parts.push(
      bx('plastic', [(x0 + x1) / 2, (yy0 + yy1) / 2, (z0 + z1) / 2], [len, CABLE_THICK, CABLE_THICK], [0, Math.atan2(-dz, dx), Math.atan2(dy, Math.hypot(dx, dz))]),
    )
  }
  for (const p of [a, b]) parts.push(bx('metal', [p[0], ROOM.height - 0.025, p[1]], [0.05, 0.05, 0.05]))
  return parts
}

/** Hanging cable loops: three in the main room and one in the Arcade_Area. */
export function cableLoopsParts(): Part[] {
  return [
    ...cableLoopParts([-4.2, -3], [-2.6, -3], 0.45),
    ...cableLoopParts([4.2, 1], [4.2, 2.8], 0.5),
    ...cableLoopParts([0.7, 0], [2.3, 0], 0.4),
    ...cableLoopParts([6, -1.2], [8.2, -1.2], 0.4),
  ]
}

/** Slim trim posts in the four inner corners of the main room (0.1 m square, from the skirting to the crown). */
export function cornerPostParts(): Part[] {
  const r = mainRoomBox()
  const y0 = SKIRT_H
  const y1 = ROOM.height - CROWN_H
  const post = 0.1
  return [
    [r.minX + post / 2, r.minZ + post / 2],
    [r.maxX - post / 2, r.minZ + post / 2],
    [r.minX + post / 2, r.maxZ - post / 2],
    [r.maxX - post / 2, r.maxZ - post / 2],
  ].map(([x, z]) => bx('trim', [x, (y0 + y1) / 2, z], [post, y1 - y0, post]))
}

/** Round wall clock high on the south wall above shelf-c, facing -Z. 0.05 m deep. */
export function wallClockParts(): Part[] {
  const r = mainRoomBox()
  const x = 3
  const y = 2.45
  const z = r.maxZ - 0.025
  return [
    part('cylinder', 'woodDark', [x, y, z], [0.46, 0.05, 0.46], [HALF_PI, 0, 0]),
    part('cylinder', 'tapeLabel', [x, y, z - 0.0275], [0.4, 0.006, 0.4], [HALF_PI, 0, 0]),
    bx('bezel', [x, y + 0.07, z - 0.034], [0.012, 0.15, 0.004]),
    bx('bezel', [x + 0.035, y - 0.01, z - 0.034], [0.016, 0.1, 0.004], [0, 0, 1.2]),
    part('cylinderLow', 'bezel', [x, y, z - 0.036], [0.03, 0.006, 0.03], [HALF_PI, 0, 0]),
  ]
}

/**
 * Desk lamps (task 23.1): a green-shaded banker's lamp and a cream-shaded table lamp on the reception desk top.
 * Positions come from the layout props `desk-lamp-left` / `desk-lamp-right` (each box is the lamp footprint).
 * Nothing here is a light: the lit look is an emissive bulb core, a warm inner shade face, a camera-facing glow
 * sprite and a light-pool decal on the desk. Lit and unlit states are different shared materials, swapped per part,
 * so one lamp's state never changes the other's.
 */
export type DeskLampKind = 'banker' | 'table'
export const DESK_LAMPS: ReadonlyArray<{ readonly id: string; readonly kind: DeskLampKind }> = [
  { id: 'desk-lamp-left', kind: 'banker' },
  { id: 'desk-lamp-right', kind: 'table' },
]
/** The pool decal floats this far above the desk top (2 mm), with a polygon offset on its material. */
export const LAMP_POOL_LIFT = 0.002

/** Layout footprint and desk-top height of a lamp, from the layout. */
export function deskLampPlacement(id: string): { box: Aabb; top: number } {
  const lamp = layoutProp(id)
  return { box: lamp.box, top: layoutProp('reception-desk').height }
}

/**
 * Materials per lamp kind and state (task 24.1). The lit set is emissive (shade emissive, bulb, additive cone, pool
 * and sprite); the unlit set is dark, and the cone, pool and sprite use the never-drawn `lampGlowOff`
 * (`visible: false`). Each lamp has its own shade, cone and pool materials, so one lamp never mutates the other's.
 */
type LampMaterialSet = Record<Exclude<NonNullable<Part['lampRole']>, 'liner'>, MaterialKey> & { liner?: MaterialKey }
export const LAMP_MATERIALS = {
  banker: {
    on: { bulb: 'bulb', inner: 'lampInnerOn', sprite: 'lampHalo', pool: 'lampPoolBanker', cone: 'lampConeBanker', shade: 'lampGreenShadeOn', liner: 'lampLinerOn' },
    off: { bulb: 'lampBulbOff', inner: 'lampInnerOff', sprite: 'lampGlowOff', pool: 'lampGlowOff', cone: 'lampGlowOff', shade: 'lampGreenShade', liner: 'lampLinerOff' },
  },
  table: {
    on: { bulb: 'bulb', inner: 'lampInnerOn', sprite: 'lampHalo', pool: 'lampPool', cone: 'lampConeTable', shade: 'lampCreamShadeOn' },
    off: { bulb: 'lampBulbOff', inner: 'lampInnerOff', sprite: 'lampGlowOff', pool: 'lampGlowOff', cone: 'lampGlowOff', shade: 'lampCreamShade' },
  },
} as const satisfies Record<DeskLampKind, Record<'on' | 'off', LampMaterialSet>>

/** Largest light-pool radius wanted by the look (24.1). The desk top is only 0.8 m deep, so the fit below caps it at 0.4 m. */
export const LAMP_POOL_RADIUS_WANTED = 0.85
/** Gap kept between the cone bottom and the desk top so the cone never z-fights the pool decal. */
const LAMP_CONE_FLOOR_GAP = 0.004

/**
 * Pool decal placement (30.1): a flat round disc centred directly beneath the shade. The radius is the wanted 0.85 m
 * capped to the distance from the lamp axis to the nearest desk top edge, so the disc stays inside the desk top
 * rectangle without moving its centre away from the lamp (the old quad was shifted inward and looked off-axis).
 */
export function lampPoolPlacement(desk: Aabb, x: number, z: number): { cx: number; cz: number; radius: number } {
  const radius = Math.max(0, Math.min(LAMP_POOL_RADIUS_WANTED, x - desk.minX, desk.maxX - x, z - desk.minZ, desk.maxZ - z))
  return { cx: x, cz: z, radius }
}

/**
 * Shade opening of each lamp, as height above the desk top and radius (30.1). Table: the cream cone shade bottom rim
 * (y 0.22, radius 0.12). Banker: the hood underside between the two skirts (the skirt bottom at y 0.247; the clear
 * opening is half of 0.13 m - 2 x 0.006 m = 0.053 m wide on each side of the axis).
 */
export const LAMP_SHADE_OPENING: Readonly<Record<DeskLampKind, { readonly rimY: number; readonly radius: number }>> = {
  banker: { rimY: 0.247, radius: 0.053 },
  table: { rimY: 0.22, radius: 0.12 },
}
/** The light cone top radius is this fraction of the shade opening radius, so no cone face leaves the shade. */
export const LAMP_CONE_TOP_FRACTION = 0.85
/** Height above the desk top where the cone top starts: inside the shade, above its bottom rim and just below the bulb centre. */
export const LAMP_CONE_TOP_Y: Readonly<Record<DeskLampKind, number>> = { banker: 0.255, table: 0.25 }

/**
 * Open light cone from just inside the shade down to the desk top, built on the shared 24-sided open `lampCone`
 * geometry (48 triangles; top radius 0.25 and bottom radius 0.5 of the scale). Its top radius is 85 % of the shade opening
 * and it starts above the shade rim, so every face is inside the shade where it passes the rim.
 * UV orientation (25.1): CylinderGeometry maps v = 1 to the top ring and v = 0 to the bottom, and a CanvasTexture is
 * flipped (flipY), so canvas row 0 of coneFalloff lands at the top and the fade runs down to the desk. No UV flip is needed.
 */
function lampCone(mat: MaterialKey, kind: DeskLampKind, x: number, z: number, top: number): Part {
  const floorY = top + LAMP_CONE_FLOOR_GAP
  const topY = top + LAMP_CONE_TOP_Y[kind]
  const h = topY - floorY
  const d = (LAMP_SHADE_OPENING[kind].radius * LAMP_CONE_TOP_FRACTION) / 0.25 // the geometry's top radius is 0.25 of the scale
  return { ...part('lampCone', mat, [x, floorY + h / 2, z], [d, h, d]), lampRole: 'cone' }
}

export function deskLampParts(box: Aabb, kind: DeskLampKind, on = true, top: number = layoutProp('reception-desk').height): Part[] {
  const { cx, cz } = centre(box)
  const m = LAMP_MATERIALS[kind][on ? 'on' : 'off']
  const role = (p: Part, lampRole: NonNullable<Part['lampRole']>): Part => ({ ...p, lampRole })
  const desk = layoutProp('reception-desk').box
  if (kind === 'banker') {
    // Shade centre: the shade sits west of the base so the whole lamp stays inside the footprint.
    const sx = cx - 0.04
    const pool = lampPoolPlacement(desk, sx, cz)
    return [
      part('cylinderLow', 'brass', [cx + 0.11, top + 0.01, cz], [0.12, 0.02, 0.12]),
      bx('brass', [cx + 0.11, top + 0.16, cz], [0.02, 0.28, 0.02]),
      bx('brass', [cx + 0.07, top + 0.3, cz], [0.1, 0.014, 0.014]),
      // Low horizontal green glass shade: a roof plus two long side skirts, open at the ends and underneath.
      role(bx(m.shade, [sx, top + 0.31, cz], [0.22, 0.025, 0.13]), 'shade'),
      role(bx(m.shade, [sx, top + 0.272, cz - 0.059], [0.22, 0.05, 0.012]), 'shade'),
      role(bx(m.shade, [sx, top + 0.272, cz + 0.059], [0.22, 0.05, 0.012]), 'shade'),
      role(part('plane', m.inner, [sx, top + 0.2965, cz], [0.2, 0.105, 1], [HALF_PI, 0, 0]), 'inner'),
      // 25.1: warm-white liner just under the hood roof (lit #fff1cc when ON, dark when OFF; swapped per mesh).
      role(part('plane', LAMP_MATERIALS.banker[on ? 'on' : 'off'].liner, [sx, top + 0.2955, cz], [0.17, 0.085, 1], [HALF_PI, 0, 0]), 'liner'),
      // 25.1: two brass end caps (8 triangles each): open square collars sleeved around the hood ends (axis along x).
      ...[-1, 1].map((s) => part('collar', 'brass', [sx + s * 0.1, top + 0.285, cz], [0.085, 0.024, 0.14], [0, 0, HALF_PI])),
      // 30.1 budget: 8-sided low cylinder (32 triangles) instead of the 80-triangle sphere.
      role(part('cylinderLow', m.bulb, [sx, top + 0.262, cz], [0.045, 0.045, 0.045]), 'bulb'),
      // 30.1: round halo (24-segment disc, drawn camera-facing by Props.tsx).
      role(part('disc', m.sprite, [sx, top + 0.27, cz], [0.42, 0.42, 1]), 'sprite'),
      // 30.1: cone from inside the hood (0.255 m up), top radius 85 % of the 0.053 m hood opening, spreading to 0.09 m at the desk.
      lampCone(m.cone, 'banker', sx, cz, top),
      role(part('disc', m.pool, [pool.cx, top + LAMP_POOL_LIFT, pool.cz], [pool.radius * 2, pool.radius * 2, 1], [-HALF_PI, 0, 0]), 'pool'),
    ]
  }
  const pool = lampPoolPlacement(desk, cx, cz)
  return [
    part('cylinderLow', 'brass', [cx, top + 0.012, cz], [0.15, 0.024, 0.15]),
    part('cylinderLow', 'brass', [cx, top + 0.12, cz], [0.045, 0.2, 0.045]),
    // Conical cream shade, open at both ends.
    role(part('cone', m.shade, [cx, top + 0.3, cz], [0.24, 0.16, 0.24]), 'shade'),
    // 30.1: the inner glow was a 0.13 m square whose corners (half-diagonal 0.092 m) stuck out of the 0.074 m shade radius at
    // y 0.372. It is now a 0.12 m disc (radius 0.06 m) that stays inside the shade.
    role(part('disc', m.inner, [cx, top + 0.372, cz], [0.12, 0.12, 1], [HALF_PI, 0, 0]), 'inner'),
    // 30.1 budget: the bulb is an 8-sided low cylinder (32 triangles) instead of the 80-triangle sphere.
    role(part('cylinderLow', m.bulb, [cx, top + 0.27, cz], [0.05, 0.05, 0.05]), 'bulb'),
    // 30.1: no camera-facing halo sprite on the table lamp: the cone, pool, inner glow and emissive shade already read.
    // 30.1: cone from inside the shade (0.25 m up), top radius 85 % of the 0.12 m shade opening, spreading to 0.204 m at the desk.
    lampCone(m.cone, 'table', cx, cz, top),
    role(part('disc', m.pool, [pool.cx, top + LAMP_POOL_LIFT, pool.cz], [pool.radius * 2, pool.radius * 2, 1], [-HALF_PI, 0, 0]), 'pool'),
  ]
}

// ---------------------------------------------------------------------------------------------
// Arcade cabinets (task 20.1): stations "arcade-snake", "arcade-maze", "arcade-frequency".
// One shared builder, parameterised per game. Front faces +z at box.maxZ in the local frame.
// ---------------------------------------------------------------------------------------------

export const ARCADE_BUTTON_MATERIALS = ['btnRed', 'btnYellow', 'btnGreen', 'btnBlue', 'btnWhite', 'btnOrange'] as const

/** Layout prop ids of the three cabinets, in the same order as the StationDefs, and the game each one is themed for. */
export const ARCADE_CABINET_IDS = ['arcade-snake', 'arcade-maze', 'arcade-frequency'] as const
export type ArcadeCabinetId = (typeof ARCADE_CABINET_IDS)[number]
export const ARCADE_CABINET_GAMES: Readonly<Record<ArcadeCabinetId, ArcadeGameKind>> = {
  'arcade-snake': 'snake',
  'arcade-maze': 'maze',
  'arcade-frequency': 'frequency',
}

/** Per-game materials: screen face, lit marquee and the coloured side T-molding (green, crimson, amber). */
export interface ArcadeCabinetStyle {
  screen: MaterialKey
  marquee: MaterialKey
  molding: MaterialKey
}
export const ARCADE_CABINET_STYLES: Readonly<Record<ArcadeGameKind, ArcadeCabinetStyle>> = {
  snake: { screen: 'arcadeScreenSnake', marquee: 'marqueeSnake', molding: 'moldingSnake' },
  maze: { screen: 'arcadeScreenMaze', marquee: 'marqueeMaze', molding: 'moldingMaze' },
  frequency: { screen: 'arcadeScreenFrequency', marquee: 'marqueeFrequency', molding: 'moldingFrequency' },
}

/** Control deck layout: two joysticks and three buttons per player (x across the deck, z toward the player). */
const DECK_STICK_X = [-0.33, 0.33] as const
const DECK_BUTTON_X = [-0.19, -0.12, -0.05, 0.05, 0.12, 0.19] as const
const DECK_BUTTON_Z = [0.07, 0.0, 0.07, 0.07, 0.0, 0.07] as const

/**
 * Cabinet parts in a local frame: `box` is the footprint with its front at `box.maxZ` (+Z).
 * The cabinets face -X in the world, so callers pass `facingFrame(...).local` and rotate the group.
 *
 * Silhouette: a stepped, sculpted side wing with coloured T-molding strips, a tilted recessed CRT bezel under a
 * visor, an upper speaker grille bar, a tilted marquee, an angled control deck with two ball-top joysticks and
 * six buttons (each in a dark inset ring), a coin door with two glowing '25c' slots, flanking grilles and a kick plate.
 */
export function arcadeCabinetParts(box: Aabb, height: number, game: ArcadeGameKind = 'snake'): Part[] {
  const style = ARCADE_CABINET_STYLES[game]
  const { cx, w, d } = centre(box)
  const lowerH = 0.95
  const upperH = height - lowerH
  const colD = d - 0.25
  const screenY = 1.33
  const sw = 0.7
  const sh = 0.38
  const t = 0.04
  const zc = -0.25 // front face of the upper column

  const stick = (x: number, ball: MaterialKey): Part[] => [
    part('cylinderLow', 'bezel', [x, 0.041, 0.05], [0.1, 0.012, 0.1]), // dark inset ring
    part('cylinderLow', 'metal', [x, 0.047, 0.05], [0.05, 0.012, 0.05]), // base plate
    part('cylinderLow', 'metal', [x, 0.1, 0.05], [0.015, 0.12, 0.015]), // shaft
    part('sphere', ball, [x, 0.17, 0.05], [0.07, 0.07, 0.07]), // ball top
  ]
  const deck: Part[] = [
    // Deck: the front lip (+z, 1.0 x 0.07 m) carries the MOVE / ACTION / 1P START legends; the top and the other faces stay plain dark.
    atlasFront('deckPlate', [0, 0, 0], [w, 0.07, 0.44], 'lip', 'plainDark'),
    ...stick(DECK_STICK_X[0], 'btnRed'),
    ...stick(DECK_STICK_X[1], 'btnBlue'),
    // Concave-looking buttons: a coloured cap sunk into a wider, darker ring.
    ...ARCADE_BUTTON_MATERIALS.flatMap((m, i): Part[] => [
      part('cylinderLow', 'bezel', [DECK_BUTTON_X[i], 0.041, DECK_BUTTON_Z[i]], [0.08, 0.012, 0.08]),
      part('cylinder', m, [DECK_BUTTON_X[i], 0.05, DECK_BUTTON_Z[i]], [0.055, 0.02, 0.055]),
    ]),
  ]
  // The marquee texture (task 20.2) is 4:1, so the lit plane keeps that ratio.
  const mw = Math.min(w * 0.9, 0.8)
  const marquee: Part[] = [
    bx('cabinet', [0, 0, 0], [w, 0.22, 0.1]),
    part('plane', style.marquee, [0, 0, 0.051], [mw, mw / 4, 1]),
  ]
  // Recessed CRT: the screen plane sits behind four raised bezel strips and under a visor with two cheeks. The whole
  // assembly leans back by 0.1 rad about its centre.
  const crt: Part[] = [
    part('plane', style.screen, [0, 0, 0.003], [sw, sh, 1]),
    bx('bezel', [0, sh / 2 + t / 2, 0.015], [sw + 2 * t, t, 0.03]),
    bx('bezel', [0, -sh / 2 - t / 2, 0.015], [sw + 2 * t, t, 0.03]),
    bx('bezel', [-sw / 2 - t / 2, 0, 0.015], [t, sh, 0.03]),
    bx('bezel', [sw / 2 + t / 2, 0, 0.015], [t, sh, 0.03]),
    bx('cabinet', [0, sh / 2 + t + 0.015, 0.05], [sw + 2 * t + 0.14, 0.03, 0.1]),
    bx('cabinet', [-(sw / 2 + t + 0.035), 0, 0.04], [0.03, sh + 2 * t, 0.08]),
    bx('cabinet', [sw / 2 + t + 0.035, 0, 0.04], [0.03, sh + 2 * t, 0.08]),
  ]
  /**
   * Sculpted side panel: a full-depth lower wing and an upper wing in three steps that taper toward the
   * back, framed by five coloured T-molding strips. `th` is the wing thickness.
   */
  const side = (sign: 1 | -1): Part[] => {
    const th = 0.03
    const xw = sign * (w / 2 + th / 2)
    const xm = sign * (w / 2 + th + 0.007)
    const stepH = upperH / 3
    const topDepth = colD - 0.15
    const out: Part[] = [bx('cabinet', [xw, 0.5, -d / 2], [th, 0.9, d - 0.02])]
    for (let i = 0; i < 3; i++) {
      const depth = colD - 0.05 * (i + 1)
      out.push(bx('cabinet', [xw, lowerH + stepH * (i + 0.5), -0.25 - depth / 2], [th, stepH - 0.012, depth]))
    }
    out.push(
      bx(style.molding, [xm, 0.94, -d / 2], [0.014, 0.025, d - 0.02]),
      bx(style.molding, [xm, 0.07, -d / 2], [0.014, 0.025, d - 0.02]),
      bx(style.molding, [xm, 0.5, -0.025], [0.014, 0.88, 0.025]),
      bx(style.molding, [xm, lowerH + upperH / 2, zc - 0.015], [0.014, upperH - 0.02, 0.025]),
      bx(style.molding, [xm, height - 0.012, -0.25 - topDepth / 2], [0.014, 0.025, topDepth]),
    )
    return out
  }
  const slot = (x: number): Part[] => [
    bx('bezel', [x, 0.52, 0.01], [0.06, 0.11, 0.012]),
    bx('coinGlow', [x, 0.52, 0.017], [0.012, 0.06, 0.012]), // glowing coin slot
    bx('coinGlow', [x, 0.45, 0.017], [0.04, 0.012, 0.012]), // lit '25c' label bar
  ]
  const local: Part[] = [
    bx('cabinet', [0, lowerH / 2, -d / 2], [w, lowerH, d]),
    bx('cabinet', [0, lowerH + upperH / 2, -(0.25 + colD / 2)], [w, upperH, colD]),
    ...tiltX(crt, [0, screenY, zc + 0.03], -0.1),
    // Upper speaker grille bar between the deck and the screen.
    bx('grille', [0, 1.075, zc + 0.012], [sw, 0.06, 0.024]),
    ...tiltX(deck, [0, 1.0, -0.22], 0.2),
    ...tiltX(marquee, [0, 1.68, -0.2], 0.25),
    ...side(1),
    ...side(-1),
    // Coin door with two glowing slots, flanking louvered speaker grilles and the kick plate.
    atlasFront('cabinetPanel', [0, 0.48, 0.004], [0.26, 0.34, 0.012], 'door', 'plainSteel'),
    ...slot(-0.07),
    ...slot(0.07),
    bx('grille', [-0.3, 0.5, 0.004], [0.2, 0.3, 0.008]),
    bx('grille', [0.3, 0.5, 0.004], [0.2, 0.3, 0.008]),
    atlasFront('cabinetPanel', [0, 0.075, 0.004], [w * 0.98, 0.13, 0.012], 'kick', 'plainSteel'),
  ]
  return offset(local, [cx, 0, box.maxZ])
}


// ---------------------------------------------------------------------------------------------
// Arcade_Area dressing (task 15.6): CRT stack, ARCADE sign, floor runner and cable runs.
// All visual only. Colliders for the solid pieces come from the layout props.
// ---------------------------------------------------------------------------------------------

const layoutProp = (id: string) => {
  const p = ROOM.props.find((q) => q.id === id)
  if (!p) throw new Error(`Missing prop ${id}`)
  return p
}

/** Three stacked, powered-down CRT monitors on a low wooden base. `box` is a local footprint (front at +Z). */
export function crtStackParts(box: Aabb, height: number): Part[] {
  const { cx, cz, w, d } = centre(box)
  const baseH = 0.2
  const h = (height - baseH) / 3
  const mw = w * 0.9
  const md = d * 0.9
  const front = cz + md / 2
  // Slightly crooked stacking, fixed offsets (no randomness).
  const shifts = [0.02, -0.03, 0.01] as const
  const parts: Part[] = [bx('woodDark', [cx, baseH / 2, cz], [w, baseH, d])]
  shifts.forEach((s, i) => {
    const y = baseH + h * (i + 0.5)
    parts.push(
      // Same dark molded crtCasing look as the television and reference monitor: one tile per monitor width (task 22.2).
      { ...bx('crtCasing', [cx + s, y, cz], [mw, h, md]), metricRepeat: mw },
      bx('bezel', [cx + s, y, front + 0.003], [mw * 0.8, h * 0.82, 0.006]),
      part('plane', 'screenOff', [cx + s, y, front + 0.0065], [mw * 0.68, h * 0.66, 1]),
    )
  })
  return parts
}

/** Stroke lettering for the sign. Since task 15.7 the sign shows a textured face; these boxes are the fallback when no canvas exists. */
export const ARCADE_SIGN_TEXT = 'ARCADE'
const GLYPH_W = 0.26
const GLYPH_H = 0.34
const GLYPH_GAP = 0.1
const STROKE = 0.05
const LETTER_DEPTH = 0.03

interface Stroke {
  /** Centre across the letter (0 = left edge) and up from its bottom, plus size. */
  z: number
  y: number
  dz: number
  dy: number
  /** Rotation about X for diagonals; the box length then runs along dy. */
  rot?: number
}

function glyphStrokes(ch: string): Stroke[] {
  const W = GLYPH_W
  const H = GLYPH_H
  const t = STROKE
  const left: Stroke = { z: t / 2, y: H / 2, dz: t, dy: H }
  const right: Stroke = { z: W - t / 2, y: H / 2, dz: t, dy: H }
  const top: Stroke = { z: W / 2, y: H - t / 2, dz: W, dy: t }
  const mid: Stroke = { z: W / 2, y: H / 2, dz: W, dy: t }
  const bottom: Stroke = { z: W / 2, y: t / 2, dz: W, dy: t }
  switch (ch) {
    case 'A':
      return [left, right, top, mid]
    case 'C':
      return [left, top, bottom]
    case 'D':
      return [left, top, bottom, { ...right, y: H / 2, dy: H - 2 * t }]
    case 'E':
      return [left, top, mid, bottom]
    case 'R': {
      // Leg from the middle bar down to the bottom right corner.
      const sz = W * 0.35
      const sy = H / 2
      const ez = W - t / 2
      const ey = 0.02
      const len = Math.hypot(ez - sz, ey - sy)
      return [
        left,
        top,
        mid,
        { z: W - t / 2, y: (H * 3) / 4 - t / 4, dz: t, dy: H / 2 - t / 2 },
        { z: (sz + ez) / 2, y: (sy + ey) / 2, dz: t, dy: len, rot: Math.atan2(ez - sz, ey - sy) },
      ]
    }
    default:
      throw new Error(`No glyph for ${ch}`)
  }
}

/** Sign lettering as emissive box strokes, reading left to right for a viewer facing east (increasing z). */
export function arcadeSignLetterParts(): Part[] {
  const sign = layoutProp('arcade-sign')
  const el = sign.elevation ?? 0
  const x = sign.box.minX - 0.02
  const total = ARCADE_SIGN_TEXT.length * GLYPH_W + (ARCADE_SIGN_TEXT.length - 1) * GLYPH_GAP
  const zStart = (sign.box.minZ + sign.box.maxZ) / 2 - total / 2
  const yBottom = el + sign.height / 2 - GLYPH_H / 2
  const parts: Part[] = []
  ;[...ARCADE_SIGN_TEXT].forEach((ch, i) => {
    const z0 = zStart + i * (GLYPH_W + GLYPH_GAP)
    for (const s of glyphStrokes(ch)) {
      const size: Vec3 = [LETTER_DEPTH, s.dy, s.dz]
      parts.push(bx('signText', [x, yBottom + s.y, z0 + s.z], size, s.rot === undefined ? undefined : [s.rot, 0, 0]))
    }
  })
  return parts
}

/**
 * Sign body: dark backing box on the lintel and pillar faces, a glowing face plane and two trim strips.
 * Only the lettering is meant to be swapped for a texture later. No light source.
 */
export function arcadeSignBodyParts(): Part[] {
  const sign = layoutProp('arcade-sign')
  const el = sign.elevation ?? 0
  const len = sign.box.maxZ - sign.box.minZ
  const zc = (sign.box.minZ + sign.box.maxZ) / 2
  const faceX = sign.box.minX - 0.003
  return [
    bx('signBack', [(sign.box.minX + sign.box.maxX) / 2, el + sign.height / 2, zc], [sign.box.maxX - sign.box.minX, sign.height, len]),
    part('plane', 'signGlow', [faceX, el + sign.height / 2, zc], [len - 0.1, sign.height - 0.08, 1], [0, -HALF_PI, 0]),
    // Textured lettering face (4:1, matches drawSignFace). Emissive basic material, no light.
    part('plane', 'signFace', [faceX - 0.004, el + sign.height / 2, zc], [(sign.height - 0.08) * 4, sign.height - 0.08, 1], [0, -HALF_PI, 0]),
    bx('signText', [faceX - 0.012, el + sign.height - 0.05, zc], [0.02, 0.02, len - 0.16]),
    bx('signText', [faceX - 0.012, el + 0.05, zc], [0.02, 0.02, len - 0.16]),
  ]
}

export function arcadeSignParts(): Part[] {
  return [...arcadeSignBodyParts(), ...arcadeSignLetterParts()]
}

/** Poster plane aspect (width / height), matching the 256 x 512 poster textures. */
export const POSTER_ASPECT = 0.5
const POSTER_CENTRE_Y = 1.7
const POSTER_FRAME = 0.05

/**
 * The two framed posters (task 15.7): textured plane plus a four-piece wooden frame whose front stands
 * 3 mm proud of the poster. Positions come from the poster props; the north wall posters face +z.
 */
export function posterParts(): Part[] {
  const specs = [
    ['poster-north', 'posterSunset'],
    ['poster-arcade-area', 'posterReel'],
  ] as const
  const t = POSTER_FRAME
  const parts: Part[] = []
  for (const [id, mat] of specs) {
    const p = layoutProp(id)
    const cx = (p.box.minX + p.box.maxX) / 2
    const z = p.box.maxZ + 0.005
    const h = p.height
    const w = h * POSTER_ASPECT
    const zf = z - 0.012
    parts.push(
      part('plane', mat, [cx, POSTER_CENTRE_Y, z], [w, h, 1]),
      bx('woodDark', [cx, POSTER_CENTRE_Y + h / 2 + t / 2, zf], [w + 2 * t, t, 0.03]),
      bx('woodDark', [cx, POSTER_CENTRE_Y - h / 2 - t / 2, zf], [w + 2 * t, t, 0.03]),
      bx('woodDark', [cx - w / 2 - t / 2, POSTER_CENTRE_Y, zf], [t, h, 0.03]),
      bx('woodDark', [cx + w / 2 + t / 2, POSTER_CENTRE_Y, zf], [t, h, 0.03]),
    )
  }
  return parts
}

/** Floor runner decal (plane, no collider) and flat cable runs (boxes, no collider). */
export function arcadeFloorParts(): Part[] {
  const mid = (b: Aabb) => [(b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2] as const
  const runner = layoutProp('arcade-runner').box
  const [rx, rz] = mid(runner)
  const parts: Part[] = [
    part('plane', 'runner', [rx, 0.011, rz], [runner.maxX - runner.minX, runner.maxZ - runner.minZ, 1], [-HALF_PI, 0, 0]),
  ]
  for (const id of ['arcade-cable-a', 'arcade-cable-b']) {
    const p = layoutProp(id)
    const [cx, cz] = mid(p.box)
    parts.push(bx('plastic', [cx, p.height / 2, cz], [p.box.maxX - p.box.minX, p.height, p.box.maxZ - p.box.minZ]))
  }
  return parts
}

/** Task 25.2: floor glow decal size (m, square), distance west of each cabinet anchor, and heights. */
export const ARCADE_GLOW_SIZE = 0.9
export const ARCADE_GLOW_OFFSET_X = 0.6
/** Above the runner decal (y 0.011) so the maze glow is not hidden, and well above the floor. */
export const ARCADE_GLOW_Y = 0.014
export const ARCADE_RUNNER_Y = 0.011
const ARCADE_GLOW_MATERIALS = { snake: 'arcadeGlowSnake', maze: 'arcadeGlowMaze', frequency: 'arcadeGlowFrequency' } as const satisfies Record<ArcadeGameKind, MaterialKey>

/**
 * Three subtle additive floor glows (2 triangles each, no light, no collider) west of the cabinet fronts, tinted with
 * each cabinet colour. Positions derive from the arcade Station anchors. Static: Memory_Shift and reduced motion do not change them.
 */
export function arcadeFloorGlowParts(): Part[] {
  return ROOM.stations
    .filter((s) => s.id === 'arcade' && s.arcadeGame)
    .map((s) =>
      part('plane', ARCADE_GLOW_MATERIALS[s.arcadeGame!], [s.anchor.x - ARCADE_GLOW_OFFSET_X, ARCADE_GLOW_Y, s.anchor.z], [ARCADE_GLOW_SIZE, ARCADE_GLOW_SIZE, 1], [-HALF_PI, 0, 0]),
    )
}

// ---------------------------------------------------------------------------------------------
// Bookcases: carcass parts, books and slipcases live in shelfModel.ts (task 18.2)
// ---------------------------------------------------------------------------------------------

export * from './shelfModel'

// ---------------------------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------------------------

/** Armchair upholstery box (task 22.1): real-size geometry with metric fabric UVs, like the couch. */
const fa = (mat: 'armchairBody' | 'armchairCushion', pos: Vec3, scale: Vec3, rot?: Vec3): Part => ({ ...bx(mat, pos, scale, rot), metricFabric: true })

export function armchairParts(box: Aabb): Part[] {
  const { cx, cz, w, d } = centre(box)
  const parts: Part[] = []
  const leg = 0.05
  for (const lx of [box.minX + leg / 2, box.maxX - leg / 2]) {
    for (const lz of [box.minZ + leg / 2, box.maxZ - leg / 2]) parts.push(part('cylinderLow', 'woodDark', [lx, 0.06, lz], [leg, 0.12, leg]))
  }
  parts.push(
    fa('armchairBody', [cx, 0.21, cz], [w, 0.18, d]),
    fa('armchairCushion', [cx, 0.36, cz - 0.04], [w - 0.2, 0.12, d - 0.15]),
    // Back shell and tilted back cushion (back on the +z side).
    fa('armchairBody', [cx, 0.58, box.maxZ - 0.07], [w - 0.04, 0.6, 0.14]),
    fa('armchairCushion', [cx, 0.6, box.maxZ - 0.17], [w - 0.24, 0.36, 0.1], [0.15, 0, 0]),
    fa('armchairBody', [box.minX + 0.05, 0.41, cz], [0.1, 0.22, d - 0.04]),
    fa('armchairBody', [box.maxX - 0.05, 0.41, cz], [0.1, 0.22, d - 0.04]),
    // Rolled arm tops (axis along z), rolled back top (axis along x) and a throw pillow on the seat.
    part('cylinderLow', 'armchairBody', [box.minX + 0.05, 0.53, cz], [0.11, d - 0.04, 0.11], [HALF_PI, 0, 0]),
    part('cylinderLow', 'armchairBody', [box.maxX - 0.05, 0.53, cz], [0.11, d - 0.04, 0.11], [HALF_PI, 0, 0]),
    part('cylinderLow', 'armchairBody', [cx, 0.88, box.maxZ - 0.07], [0.1, w - 0.04, 0.1], [0, 0, HALF_PI]),
    bx('rugLight', [cx + 0.14, 0.5, cz + 0.02], [0.2, 0.16, 0.06], [-0.5, 0.2, 0.1]),
  )
  return parts
}

/** Top of the seat cushions, and the lean of the back cushions about the couch's length (x) axis. */
export const COUCH_SEAT_TOP = 0.42
export const COUCH_BACK_TILT = 0.12
/** Size of the throw pillow (x, y, z) and the contact gaps used when it is placed. */
export const COUCH_PILLOW_SIZE: Vec3 = [0.29, 0.3, 0.08]
export const COUCH_PILLOW_GAP = 0.0015

/** Upholstery box: real-size geometry with metric UVs, so the corduroy wales keep their size on every part. */
const fb = (mat: MaterialKey, pos: Vec3, scale: Vec3, rot?: Vec3): Part => ({ ...bx(mat, pos, scale, rot), metricFabric: true })

/**
 * Couch (task 21.1). Front faces -z, backrest on the +z side. Fixes over the first version:
 * - The cyan throw pillow no longer cuts through the backrest and seat. It stands in the left seat corner,
 *   leaning with the same tilt as the back cushions: its rear face is parallel to the back cushion front face
 *   (1.5 mm gap), its lowest edge rests 1 mm above the seat top and its left face touches the armrest by 1.5 mm.
 * - The two dark "worn patch" boxes are removed. The one on the middle seat cushion was a hard-edged dark
 *   rectangle lying 4 mm above the cushion top, the one on the back cushion was buried inside the backrest.
 * - Roll cylinders stop 2 mm short of the faces they sit against, so no cap is coplanar with a box face.
 */
export function couchParts(box: Aabb): Part[] {
  const { cx, cz, w, d } = centre(box)
  const parts: Part[] = []
  for (const lx of [box.minX + 0.08, box.maxX - 0.08]) {
    for (const lz of [box.minZ + 0.08, box.maxZ - 0.08]) parts.push(part('cylinderLow', 'woodDark', [lx, 0.04, lz], [0.07, 0.08, 0.07]))
  }
  parts.push(
    fb('couchBody', [cx, 0.18, cz], [w, 0.2, d]),
    // Backrest on the +z side.
    fb('couchBody', [cx, 0.555, box.maxZ - 0.1], [w - 0.4, 0.55, 0.2]),
    // Arms with rolled tops (rolls are 4 mm shorter than the arms).
    fb('couchBody', [box.minX + 0.1, 0.45, cz], [0.2, 0.34, d]),
    fb('couchBody', [box.maxX - 0.1, 0.45, cz], [0.2, 0.34, d]),
    part('cylinder', 'couchBody', [box.minX + 0.1, 0.62, cz], [0.2, d - 0.004, 0.2], [HALF_PI, 0, 0]),
    part('cylinder', 'couchBody', [box.maxX - 0.1, 0.62, cz], [0.2, d - 0.004, 0.2], [HALF_PI, 0, 0]),
    // Rolled top along the backrest.
    part('cylinderLow', 'couchBody', [cx, 0.84, box.maxZ - 0.1], [0.16, w - 0.404, 0.16], [0, 0, HALF_PI]),
  )
  const inner = w - 0.4
  const sw = inner / 3 - 0.01
  const sd = d - 0.24
  const seatZ = box.minZ + 0.02 + sd / 2
  const backZ = box.maxZ - 0.26
  const backY = 0.62
  const backD = 0.12
  for (let i = 0; i < 3; i++) {
    const x = box.minX + 0.2 + (i + 0.5) * (inner / 3)
    parts.push(
      fb('couchCushion', [x, 0.35, seatZ], [sw, 0.14, sd]),
      fb('couchCushion', [x, backY, backZ], [sw, 0.4, backD], [COUCH_BACK_TILT, 0, 0]),
    )
  }
  // Throw pillow in the left seat corner. Rotation about x by the back-cushion tilt; position solved from the
  // seat top (lowest edge), the armrest inner face (x) and the back cushion front plane (parallel rear face).
  const th = COUCH_BACK_TILT
  const s = Math.sin(th)
  const c = Math.cos(th)
  const [pw, ph, pd] = COUCH_PILLOW_SIZE
  const py = COUCH_SEAT_TOP + 0.001 + (ph / 2) * c + (pd / 2) * s
  const frontY = backY + (backD / 2) * s
  const frontZ = backZ - (backD / 2) * c
  const pz = frontZ + ((py - frontY) * s - (pd / 2 + COUCH_PILLOW_GAP)) / c
  const px = box.minX + 0.2 + COUCH_PILLOW_GAP + pw / 2
  parts.push(fb('couchPillow', [px, py, pz], COUCH_PILLOW_SIZE, [th, 0, 0]))
  return parts
}

/** Ribbed crate: dark core, two slat rings per level that stick out on all four faces, lid, corner posts. */
export function crateParts(box: Aabb, height: number): Part[] {
  const { cx, cz, w, d } = centre(box)
  const parts: Part[] = [bx('woodDark', [cx, height / 2, cz], [w - 0.02, height - 0.02, d - 0.02])]
  const levels = Math.max(2, Math.floor(height / 0.15))
  const pitch = (height - 0.06) / levels
  for (let i = 0; i < levels; i++) {
    const y = 0.03 + pitch * (i + 0.5)
    const sh = pitch * 0.6
    parts.push(bx('crateWood', [cx, y, cz], [w + 0.02, sh, d - 0.02]), bx('crateWood', [cx, y, cz], [w - 0.02, sh, d + 0.02]))
  }
  parts.push(bx('crateSlat', [cx, height - 0.012, cz], [w, 0.024, d]))
  // Diagonal brace on the front face and hand-hold slots on both end faces.
  const brace = Math.hypot(w, height) * 0.8
  parts.push(
    bx('crateSlat', [cx, height / 2, box.maxZ + 0.016], [0.045, brace, 0.012], [0, 0, -Math.atan2(w, height)]),
    bx('bezel', [box.minX - 0.012, height * 0.62, cz], [0.012, 0.05, d * 0.4]),
    bx('bezel', [box.maxX + 0.012, height * 0.62, cz], [0.012, 0.05, d * 0.4]),
  )
  // Shipping-label panel (task 22.2): the crates stay wood-slatted and show the cardboard texture only on this 0.3 x 0.2 m panel on
  // the room-facing (-X) side, below the hand-hold. One tile spans the panel width, so the shipping label, the tape band and the
  // lower stencil text keep their proportions; the panel shows v 0..0.67 of the tile. It sticks out 0.016 m from the box side.
  const panelW = 0.3
  parts.push({ ...bx('crate', [box.minX - 0.014, height * 0.32, cz], [0.004, 0.2, panelW]), metricRepeat: panelW })
  const post = 0.05
  for (const px of [box.minX + post / 2 - 0.006, box.maxX - post / 2 + 0.006]) {
    for (const pz of [box.minZ + post / 2 - 0.006, box.maxZ - post / 2 + 0.006]) {
      parts.push(bx('crateSlat', [px, (height - 0.03) / 2, pz], [post, height - 0.03, post]))
    }
  }
  return parts
}

/** Desk clutter heights in metres (task 22.2 part B). */
export const MUG_BODY_H = 0.089
export const MUG_RIM_H = 0.006
/** Task 26.1: thickness of the coffee surface disc on the rim and of the stain disc on the desk top. */
export const MUG_COFFEE_H = 0.0012
export const MUG_STAIN_H = 0.001
export const NOTE_COVER_H = 0.006
export const NOTE_PAGE_H = 0.01
/**
 * Notepad centre relative to the desk centre (task 25.1). Matches the desk-notebook anchor in roomLayout.ts. The guest book (rug part)
 * moved 0.12 m toward the back so the rotated pad (footprint about 0.2 x 0.24 m) does not overlap it; the pencil moved with the pad.
 */
export const NOTE_DX = -0.58
export const NOTE_DZ = 0.02

/** Reception desk (front on the +z side; the two lamps are `deskLampParts`): panelled front, drawers, bell, book and archive box. */
export function deskParts(box: Aabb, height: number): Part[] {
  const { cx, cz, w, d } = centre(box)
  const top = height
  const f = box.maxZ
  return [
    wd('woodDark', [cx, (height - 0.06) / 2, cz], [w, height - 0.06, d]),
    wd('wood', [cx, top - 0.03, cz], [w + 0.1, 0.06, d + 0.1]),
    // Front: knee-space recess, drawer bank on the left, cabinet door on the right.
    bx('bezel', [cx, 0.45, f + 0.002], [1.1, 0.7, 0.004]),
    bx('wood', [cx - 1.0, 0.7, f + 0.006], [0.6, 0.22, 0.012]),
    bx('wood', [cx - 1.0, 0.4, f + 0.006], [0.6, 0.22, 0.012]),
    bx('wood', [cx + 1.0, 0.5, f + 0.006], [0.6, 0.7, 0.012]),
    bx('metal', [cx - 1.0, 0.7, f + 0.018], [0.14, 0.02, 0.02]),
    bx('metal', [cx - 1.0, 0.4, f + 0.018], [0.14, 0.02, 0.02]),
    bx('metal', [cx + 0.8, 0.5, f + 0.018], [0.02, 0.14, 0.02]),
    // Service bell and guest book.
    part('cylinderLow', 'metal', [cx + 0.1, top + 0.01, cz + 0.15], [0.1, 0.02, 0.1]),
    part('sphere', 'metal', [cx + 0.1, top + 0.03, cz + 0.15], [0.07, 0.04, 0.07]),
    bx('rug', [cx - 0.6, top + 0.015, cz - 0.22], [0.28, 0.03, 0.2]),
    bx('tapeLabel', [cx - 0.6, top + 0.032, cz - 0.22], [0.25, 0.004, 0.17]),
    // Archive box with upright tapes.
    { ...bx('crate', [cx + 0.5, top + 0.1, cz], [0.4, 0.2, 0.3]), metricRepeat: 0.4 },
    bx('crateSlat', [cx + 0.5, top + 0.2, cz + 0.14], [0.42, 0.02, 0.02]),
    bx('spineA', [cx + 0.4, top + 0.22, cz], [0.03, 0.19, 0.1]),
    bx('spineB', [cx + 0.45, top + 0.22, cz], [0.03, 0.19, 0.1]),
    bx('spineC', [cx + 0.5, top + 0.22, cz], [0.03, 0.19, 0.1]),
    bx('spineA', [cx + 0.55, top + 0.22, cz], [0.03, 0.19, 0.1]),
    // Coffee mug (low-segment cylinder with a handle), a notepad with a pencil and a loose tape.
    // Mug (task 22.2 part B): body 0.089 m tall plus a lighter ceramic rim ring 0.006 m tall on top (total 0.095 m, as before).
    part('cylinderLow', 'mug', [cx + 0.95, top + MUG_BODY_H / 2, cz - 0.1], [0.08, MUG_BODY_H, 0.08]),
    part('cylinderLow', 'mugRim', [cx + 0.95, top + MUG_BODY_H + MUG_RIM_H / 2, cz - 0.1], [0.084, MUG_RIM_H, 0.084]),
    bx('mug', [cx + 0.95 + 0.048, top + 0.04, cz - 0.1], [0.014, 0.05, 0.016]),
    // Task 26.1: a dark coffee surface resting on the glazed rim (the lighter rim reads as the highlight), and a translucent
    // coffee ring stain on the desk top beside the mug. Both are flat 8-sided discs (32 triangles each) and touch no other part.
    part('cylinderLow', 'coffee', [cx + 0.95, top + MUG_BODY_H + MUG_RIM_H + MUG_COFFEE_H / 2, cz - 0.1], [0.07, MUG_COFFEE_H, 0.07]),
    part('cylinderLow', 'coffeeStain', [cx + 0.95 - 0.02, top + MUG_STAIN_H / 2, cz - 0.1 + 0.095], [0.085, MUG_STAIN_H, 0.085]),
    // Notepad (task 22.2 part B): a grain-textured cover under a ruled page block (deskDetail cells), both rotated 0.25 rad;
    // the spiral strip rests on the page along its top edge. One tile of deskDetail spans DESK_DETAIL_TILE_M metres.
    {
      ...bx('notebookCover', [cx + NOTE_DX, top + NOTE_COVER_H / 2, cz + NOTE_DZ], [0.15, NOTE_COVER_H, 0.21], [0, 0.25, 0]),
      metricRepeat: DESK_DETAIL_TILE_M,
      metricAspect: DESK_DETAIL_ASPECT,
    },
    {
      ...bx('paper', [cx + NOTE_DX, top + NOTE_COVER_H + NOTE_PAGE_H / 2, cz + NOTE_DZ], [0.14, NOTE_PAGE_H, 0.2], [0, 0.25, 0]),
      metricRepeat: DESK_DETAIL_TILE_M,
      metricAspect: DESK_DETAIL_ASPECT,
      metricOffset: [DESK_DETAIL_TILE_M / 2, 0],
    },
    bx('metal', [cx + NOTE_DX - 0.0243, top + NOTE_COVER_H + NOTE_PAGE_H + 0.003, cz + NOTE_DZ - 0.095], [0.15, 0.006, 0.008], [0, 0.25, 0]),
    part('cylinderLow', 'spineC', [cx + NOTE_DX + 0.25, top + 0.006, cz + NOTE_DZ + 0.2], [0.01, 0.16, 0.01], [0, 0.5, HALF_PI]),
    tape('tapeBlack', [cx + 0.75, top + 0.015, cz + 0.2], [0.19, 0.03, 0.1], [0, -0.5, 0]),
    // Two loose tapes with labels.
    tape('tapeBlack', [cx - 0.2, top + 0.015, cz + 0.05], [0.19, 0.03, 0.1]),
    tape('tapeBlack', [cx - 0.2, top + 0.045, cz + 0.05], [0.19, 0.03, 0.1]),
    bx('tapeLabel', [cx - 0.2, top + 0.0605, cz + 0.05], [0.1, 0.002, 0.06]),
  ]
}

// ---------------------------------------------------------------------------------------------
// Room dressing: ceiling fluorescent fixtures, skirting and ceiling trim
// ---------------------------------------------------------------------------------------------

export const FIXTURE_LENGTH = 1.2
export const FIXTURE_WIDTH = 0.22
/** The bloom strip hangs this far below the ceiling: 8 mm under the tube bottom (tube bottom is 0.072 m down). */
export const CEILING_BLOOM_DROP = 0.08

/** Ceiling fixture centres, derived from the main-room and arcade-area extents in the layout. */
export function fixtureCentres(): Array<readonly [number, number]> {
  const b = ROOM.bounds
  // Walls: [0] north, [2] west, [3] east segment of the main room, [6] Arcade_Area north.
  const mainMinX = ROOM.walls[2].maxX
  const mainMaxX = ROOM.walls[3].minX
  const arcadeMinX = ROOM.walls[3].maxX
  const mx = (mainMinX + mainMaxX) / 2
  const dx = (mainMaxX - mainMinX) / 4
  const dz = (b.maxZ - b.minZ) / 4
  const mz = (b.minZ + b.maxZ) / 2
  const ax = (arcadeMinX + b.maxX) / 2
  return [
    [mx - dx, mz - dz],
    [mx + dx, mz - dz],
    [mx - dx, mz + dz],
    [mx + dx, mz + dz],
    [ax, mz],
  ]
}

/** Housings are metal; the tube is an emissive box on a MeshBasicMaterial. Neither is a light. */
export function ceilingFixtureParts(cx: number, cz: number): Part[] {
  const y = ROOM.height
  return [
    bx('metal', [cx, y - 0.03, cz], [FIXTURE_LENGTH, 0.06, FIXTURE_WIDTH]),
    bx('fluorescent', [cx, y - 0.066, cz], [FIXTURE_LENGTH - 0.1, 0.012, FIXTURE_WIDTH - 0.08]),
    // Task 24.1: faint additive bloom strip just below the tube (2 triangles), facing down. Room.tsx skips it without the glow texture.
    part('plane', 'ceilingBloom', [cx, y - CEILING_BLOOM_DROP, cz], [FIXTURE_LENGTH + 0.5, FIXTURE_WIDTH + 0.5, 1], [HALF_PI, 0, 0]),
  ]
}

const SKIRT_H = 0.12
const CROWN_H = 0.1

/** Skirting around every wall and door jamb, crown trim around every wall (both follow layout boxes). */
export function trimParts(): Part[] {
  const parts: Part[] = []
  const grow = (b: Aabb, g: number) => ({
    pos: [(b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2] as const,
    size: [b.maxX - b.minX + 2 * g, b.maxZ - b.minZ + 2 * g] as const,
  })
  for (const wall of ROOM.walls) {
    const s = grow(wall, 0.02)
    parts.push(bx('skirting', [s.pos[0], SKIRT_H / 2, s.pos[2]], [s.size[0], SKIRT_H, s.size[1]]))
    const c = grow(wall, 0.03)
    parts.push(bx('trim', [c.pos[0], ROOM.height - CROWN_H / 2, c.pos[2]], [c.size[0], CROWN_H, c.size[1]]))
  }
  for (const door of ROOM.doors) {
    for (const frame of door.frames) {
      const s = grow(frame, 0.02)
      parts.push(bx('skirting', [s.pos[0], SKIRT_H / 2, s.pos[2]], [s.size[0], SKIRT_H, s.size[1]]))
    }
  }
  return parts
}

/** Thickness of door-detail plates: they protrude this far from the frame or wall face they sit on (limit 0.02 m). */
export const DOOR_DETAIL_T = 0.01
export const DOOR_DETAIL_LIMIT = 0.02

/**
 * East doorway detail (task 22.2 part B). The doorways have no leaves, so nothing may enter an opening: every
 * part is a thin plate on the outside of a jamb or of the pillar wall between the doors, never on the faces
 * that look into an opening. Per side of the pillar (west x = pillar.minX, east x = pillar.maxX): a dark
 * wood panel inset and a metal kickplate just above the skirting. Plus a kickplate on the room-side face of
 * each outer jamb. Visual only: no Colliders.
 */
export function doorDetailParts(): Part[] {
  const [first, second] = ROOM.doors
  const outerNorth = first.frames[0]
  const outerSouth = second.frames[1]
  const lo = first.frames[1].maxZ
  const hi = second.frames[0].minZ
  const pillar = ROOM.walls.find((w) => w.minZ >= lo - 1e-6 && w.maxZ <= hi + 1e-6)
  if (!pillar) throw new Error('Missing pillar wall between the east doors')
  const t = DOOR_DETAIL_T
  const kickY = SKIRT_H + 0.09
  const parts: Part[] = []
  const pcz = (pillar.minZ + pillar.maxZ) / 2
  const pw = pillar.maxZ - pillar.minZ
  for (const x of [pillar.minX - t / 2, pillar.maxX + t / 2]) {
    parts.push(wd('woodDark', [x, 1.15, pcz], [t, 1.5, pw * 0.78]), bx('metal', [x, kickY, pcz], [t, 0.18, pw - 0.04]))
  }
  for (const f of [outerNorth, outerSouth]) {
    parts.push(bx('metal', [f.minX - t / 2, kickY, (f.minZ + f.maxZ) / 2], [t, 0.18, f.maxZ - f.minZ - 0.02]))
  }
  return parts
}

// ---------------------------------------------------------------------------------------------
// Counting helpers (pure)
// ---------------------------------------------------------------------------------------------

export function countTriangles(parts: readonly Part[]): number {
  return parts.reduce((n, p) => n + GEOMETRY_TRIANGLES[p.geo], 0)
}

/** Draw calls after grouping by geometry + material (one InstancedMesh or Mesh per group). */
export function countDrawCalls(parts: readonly Part[]): number {
  return new Set(parts.map(partGroupKey)).size
}

export interface SceneDetailReport {
  objects: ReadonlyArray<{ name: string; triangles: number; drawCalls: number }>
  /** Triangles of the declared decorative parts, tapes included. Floor, ceiling, wall and door blocks add `baseTriangles`. */
  detailTriangles: number
  baseTriangles: number
  baseDrawCalls: number
  totalTriangles: number
  totalDrawCalls: number
  /** VHS slipcase instances on the bookcases. */
  tapeCount: number
  /** Book instances on the bookcases (rows, leaning books and stacks). */
  bookCount: number
  leaningCount: number
  /** Procedural canvas textures (task 15.7) and their estimated GPU memory in bytes. */
  textureCount: number
  textureMemoryBytes: number
}

/** Every declared object, built from the layout. Order matches the component tree. */
export function declaredObjects(): Array<{ name: string; parts: Part[]; extraTriangles?: number; extraDrawCalls?: number }> {
  const prop = (id: string) => {
    const p = ROOM.props.find((q) => q.id === id)
    if (!p) throw new Error(`Missing prop ${id}`)
    return p
  }
  const crt = prop('crt-vhs')
  const stack = prop('crt-stack')
  const objects: Array<{ name: string; parts: Part[]; extraTriangles?: number; extraDrawCalls?: number }> = [
    { name: 'crt-television', parts: crtTelevisionParts(crt.box, crt.height) },
    { name: 'vcr-deck', parts: vcrDeckParts(crt.box) },
    { name: 'media-console', parts: mediaConsoleParts(crt.box) },
    { name: 'console-tapes', parts: consoleTapeParts(crt.box) },
    { name: 'reference-monitor', parts: referenceMonitorParts(crt.box) },
    { name: 'console-cables', parts: consoleCableParts(crt.box) },
    { name: 'filing-cabinet-a', parts: filingCabinetParts(prop('filing-cabinet-a').box, prop('filing-cabinet-a').height, 0) },
    { name: 'filing-cabinet-b', parts: filingCabinetParts(prop('filing-cabinet-b').box, prop('filing-cabinet-b').height, 1) },
    { name: 'conduit', parts: conduitParts() },
    { name: 'ventilation', parts: ventilationParts() },
    { name: 'cable-loops', parts: cableLoopsParts() },
    { name: 'corner-posts', parts: cornerPostParts() },
    { name: 'wall-clock', parts: wallClockParts() },
    ...DESK_LAMPS.map(({ id, kind }) => ({ name: id, parts: deskLampParts(prop(id).box, kind, true, prop('reception-desk').height) })),
    { name: 'bulletin-board', parts: bulletinBoardParts() },
    ...ARCHIVE_BOX_IDS.map((id) => ({ name: id, parts: archiveBoxParts(prop(id).box, prop(id).height) })),
    ...ARCADE_CABINET_IDS.map((id) => {
      const c = prop(id)
      return { name: id, parts: arcadeCabinetParts(facingFrame(c.box, c.facing).local, c.height, ARCADE_CABINET_GAMES[id]) }
    }),
    { name: 'crt-stack', parts: crtStackParts(facingFrame(stack.box, stack.facing).local, stack.height) },
    { name: 'arcade-sign', parts: arcadeSignParts() },
    { name: 'arcade-floor', parts: arcadeFloorParts() },
    { name: 'arcade-floor-glow', parts: arcadeFloorGlowParts() },
    { name: 'posters', parts: posterParts() },
    { name: 'desk', parts: deskParts(prop('reception-desk').box, prop('reception-desk').height) },
    { name: 'armchair', parts: armchairParts(prop('abandoned-chair').box) },
    { name: 'couch', parts: couchParts(prop('couch').box) },
    { name: 'crate-a', parts: crateParts(prop('crate-a').box, prop('crate-a').height) },
    { name: 'crate-b', parts: crateParts(prop('crate-b').box, prop('crate-b').height) },
    { name: 'trim', parts: trimParts() },
    { name: 'door-detail', parts: doorDetailParts() },
    ...fixtureCentres().map(([x, z], i) => ({ name: `fixture-${i}`, parts: ceilingFixtureParts(x, z) })),
  ]
  for (const id of SHELF_IDS) {
    const p = prop(id)
    const contents = shelfContents(id, p.box, p.height)
    // Books and slipcases: one InstancedMesh per spine variant in use, all on the shared 12-triangle unit box.
    objects.push({
      name: id,
      parts: [...shelfFrameParts(p.box, p.height), ...contents.boxParts],
      extraTriangles: contents.instances.length * GEOMETRY_TRIANGLES.box,
      // Task 27.1: each arcade manual has its own geometry (its spine strip), so it is its own draw call, outside the variant groups.
      extraDrawCalls: new Set(contents.instances.filter((b) => !b.manualId).map((b) => b.variant)).size + contents.instances.filter((b) => b.manualId).length,
    })
  }
  return objects
}

/** Base room meshes that Room.tsx and Props.tsx still draw as plain boxes/planes (no instancing). */
function baseRoomCounts() {
  const frames = ROOM.doors.reduce((n, d) => n + d.frames.length, 0)
  const doorBlocks = frames + ROOM.doors.length // jambs + lintel
  const boxes = ROOM.walls.length + doorBlocks + 3 /* tape stack */ + 1 /* cable */
  // planes: floor, ceiling, thresholds, rug, 2 shift overlays (framed posters are declared parts)
  const planes = 2 + ROOM.doors.length + 1 + 2
  return { boxes, planes }
}

export function baseRoomTriangles(): number {
  const { boxes, planes } = baseRoomCounts()
  return boxes * GEOMETRY_TRIANGLES.box + planes * GEOMETRY_TRIANGLES.plane
}

export function baseRoomDrawCalls(): number {
  const { boxes, planes } = baseRoomCounts()
  return boxes + planes
}
export function sceneDetailReport(): SceneDetailReport {
  const objects = declaredObjects().map((o) => ({
    name: o.name,
    triangles: countTriangles(o.parts) + (o.extraTriangles ?? 0),
    drawCalls: countDrawCalls(o.parts) + (o.extraDrawCalls ?? 0),
  }))
  const detailTriangles = objects.reduce((n, o) => n + o.triangles, 0)
  const baseTriangles = baseRoomTriangles()
  const all = SHELF_IDS.flatMap((id) => {
    const p = ROOM.props.find((q) => q.id === id)
    return p ? shelfContents(id, p.box, p.height).instances : []
  })
  const tapeCount = all.filter((b) => b.kind === 'slipcase').length
  const bookCount = all.length - tapeCount
  const leaningCount = all.filter((b) => b.group === 'lean').length
  return {
    objects,
    detailTriangles,
    baseTriangles,
    baseDrawCalls: baseRoomDrawCalls(),
    totalTriangles: detailTriangles + baseTriangles,
    totalDrawCalls: baseRoomDrawCalls() + objects.reduce((n, o) => n + o.drawCalls, 0),
    tapeCount,
    bookCount,
    leaningCount,
    textureCount: TEXTURE_IDS.length,
    textureMemoryBytes: totalTextureMemoryBytes(),
  }
}
