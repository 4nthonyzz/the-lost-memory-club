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
import type { Aabb } from '../worldTypes'
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
}

/** Triangles per shared unit geometry. A test checks these against the real three.js geometries. */
export const GEOMETRY_TRIANGLES: Readonly<Record<GeometryKey, number>> = {
  box: 12,
  plane: 2,
  cylinder: 48, // 12 radial segments: 24 side + 24 caps
  cylinderLow: 32, // 8 radial segments: 16 side + 16 caps
  sphere: 80, // 8 x 6 segments
}

export const SCENE_TRIANGLE_BUDGET = 20000
export const MAX_LIGHTS = 4

const HALF_PI = Math.PI / 2

const part = (geo: GeometryKey, mat: MaterialKey, pos: Vec3, scale: Vec3, rot?: Vec3): Part =>
  rot ? { geo, mat, pos, scale, rot } : { geo, mat, pos, scale }
const bx = (mat: MaterialKey, pos: Vec3, scale: Vec3, rot?: Vec3) => part('box', mat, pos, scale, rot)

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
// CRT television and VCR deck (station "crt-vhs"; front faces +z at box.maxZ)
// ---------------------------------------------------------------------------------------------

/** Y where the television casing starts (stand + VCR below it). Effects.tsx uses the same 0.6. */
export const CRT_Y0 = 0.6

/** Fixed emissive CRT screen rectangle. Must equal Effects.tsx crtScreenPlacement() (minus its z nudge). */
export function crtScreenRect(box: Aabb, height: number) {
  const { cx, w } = centre(box)
  const h = height - CRT_Y0
  return {
    position: [cx - 0.05, CRT_Y0 + h / 2, box.maxZ + 0.005] as const,
    scale: [w * 0.6, h * 0.7, 1] as const,
  }
}

export function crtTelevisionParts(box: Aabb, height: number): Part[] {
  const { cx, w } = centre(box)
  const h = height - CRT_Y0
  const cy = CRT_Y0 + h / 2
  const sx = -0.05
  const sw = w * 0.6
  const sh = h * 0.7
  const t = 0.05
  const local: Part[] = [
    // Stepped casing: front shell, narrower middle shell, tapered tube.
    bx('casing', [0, cy, -0.07], [w * 0.94, h, 0.14]),
    bx('casing', [0, cy, -0.21], [w * 0.84, h * 0.9, 0.14]),
    bx('casingDark', [0, cy - 0.02, -0.38], [w * 0.6, h * 0.66, 0.2]),
    // Raised bezel frame around the screen, so the screen reads as recessed.
    bx('bezel', [sx, cy + sh / 2 + t / 2, 0.015], [sw + 2 * t, t, 0.03]),
    bx('bezel', [sx, cy - sh / 2 - t / 2, 0.015], [sw + 2 * t, t, 0.03]),
    bx('bezel', [sx - sw / 2 - t / 2, cy, 0.015], [t, sh, 0.03]),
    bx('bezel', [sx + sw / 2 + t / 2, cy, 0.015], [t, sh, 0.03]),
    // Fixed emissive screen on the shared crtScreen material (tinted only by Memory_Shift).
    part('plane', 'crtScreen', [sx, cy, 0.005], [sw, sh, 1]),
    // Two knobs, speaker slits, power LED and badge on the right strip.
    part('cylinderLow', 'metal', [0.385, 1.05, 0.012], [0.06, 0.025, 0.06], [HALF_PI, 0, 0]),
    part('cylinderLow', 'metal', [0.385, 0.95, 0.012], [0.06, 0.025, 0.06], [HALF_PI, 0, 0]),
    ...[0, 1, 2, 3].map((i) => bx('bezel', [0.385, 0.7 + i * 0.035, 0.003], [0.1, 0.01, 0.006])),
    part('cylinderLow', 'led', [0.4, 0.64, 0.006], [0.02, 0.012, 0.02], [HALF_PI, 0, 0]),
    bx('metal', [sx, 0.62, 0.003], [0.1, 0.014, 0.006]),
    // Antenna stubs.
    part('cylinderLow', 'metal', [0, 1.215, -0.3], [0.08, 0.03, 0.08]),
    part('cylinderLow', 'metal', [0.07, 1.373, -0.3], [0.012, 0.32, 0.012], [0, 0, -0.45]),
    part('cylinderLow', 'metal', [-0.07, 1.373, -0.3], [0.012, 0.32, 0.012], [0, 0, 0.45]),
  ]
  return offset(local, [cx, 0, box.maxZ])
}

export function vcrDeckParts(box: Aabb): Part[] {
  const { cx, d } = centre(box)
  const zf = -0.01
  const local: Part[] = [
    // Wooden stand: body, top ledge, two door panels with handles.
    bx('wood', [0, 0.24, -d / 2], [box.maxX - box.minX, 0.48, d]),
    bx('wood', [0, 0.49, -d / 2], [box.maxX - box.minX + 0.04, 0.02, d + 0.04]),
    bx('woodDark', [-0.24, 0.24, 0.004], [0.44, 0.38, 0.008]),
    bx('woodDark', [0.24, 0.24, 0.004], [0.44, 0.38, 0.008]),
    bx('metal', [-0.07, 0.3, 0.012], [0.015, 0.08, 0.015]),
    bx('metal', [0.07, 0.3, 0.012], [0.015, 0.08, 0.015]),
    // VCR body, front slot, partly inserted cassette with label.
    bx('plastic', [0, 0.55, -0.29], [0.9, 0.1, 0.56]),
    bx('bezel', [-0.12, 0.555, zf + 0.003], [0.4, 0.04, 0.006]),
    bx('tapeBlack', [-0.12, 0.555, -0.002], [0.19, 0.026, 0.104]),
    bx('tapeLabel', [-0.12, 0.5685, 0.025], [0.1, 0.002, 0.03]),
    // Small buttons, display strip, power LED.
    ...[0, 1, 2, 3].map((i) => bx('metal', [0.12 + i * 0.045, 0.535, zf + 0.002], [0.035, 0.02, 0.01])),
    bx('displayGreen', [0.34, 0.57, zf + 0.002], [0.1, 0.02, 0.008]),
    part('cylinderLow', 'led', [0.4, 0.535, zf + 0.002], [0.015, 0.01, 0.015], [HALF_PI, 0, 0]),
  ]
  return offset(local, [cx, 0, box.maxZ])
}

// ---------------------------------------------------------------------------------------------
// Arcade cabinet (station "arcade-cabinet"; front faces +z at box.maxZ)
// ---------------------------------------------------------------------------------------------

export const ARCADE_BUTTON_MATERIALS = ['btnRed', 'btnYellow', 'btnGreen', 'btnBlue', 'btnWhite', 'btnOrange'] as const

export function arcadeCabinetParts(box: Aabb, height: number): Part[] {
  const { cx, w, d } = centre(box)
  const lowerH = 0.95
  const upperH = height - lowerH
  const colD = d - 0.25
  const screenY = 1.33
  const sw = 0.7
  const sh = 0.38
  const t = 0.04
  const zc = -0.25 // front face of the upper column

  const deck: Part[] = [
    bx('plastic', [0, 0, 0], [w, 0.07, 0.44]),
    // Ball-top joystick.
    part('cylinderLow', 'metal', [-0.2, 0.04, 0.02], [0.07, 0.012, 0.07]),
    part('cylinderLow', 'metal', [-0.2, 0.1, 0.02], [0.015, 0.12, 0.015]),
    part('sphere', 'btnRed', [-0.2, 0.17, 0.02], [0.07, 0.07, 0.07]),
    // Six coloured buttons, two rows of three.
    ...ARCADE_BUTTON_MATERIALS.map((m, i) =>
      part('cylinder', m, [0.02 + (i % 3) * 0.085, 0.04, i < 3 ? -0.04 : 0.06], [0.06, 0.02, 0.06]),
    ),
  ]
  const marquee: Part[] = [
    bx('cabinet', [0, 0, 0], [w, 0.22, 0.1]),
    // Fixed lit marquee, never changed by state.
    part('plane', 'marquee', [0, 0, 0.051], [w * 0.88, 0.17, 1]),
  ]
  const side = (sign: 1 | -1): Part[] => {
    const x = sign * (w / 2 + 0.003)
    const xs = sign * (w / 2 + 0.005)
    const rot: Vec3 = [0, sign * HALF_PI, 0]
    return [
      part('plane', 'sideArtA', [x, 0.5, -d / 2], [d - 0.04, 0.9, 1], rot),
      part('plane', 'sideArtB', [xs, 0.5, -d / 2], [d - 0.04, 0.12, 1], rot),
      part('plane', 'sideArtA', [x, 1.375, -(0.25 + colD / 2)], [colD - 0.04, 0.8, 1], rot),
      part('plane', 'sideArtB', [xs, 1.375, -(0.25 + colD / 2)], [colD - 0.04, 0.12, 1], rot),
    ]
  }
  const local: Part[] = [
    bx('cabinet', [0, lowerH / 2, -d / 2], [w, lowerH, d]),
    bx('cabinet', [0, lowerH + upperH / 2, -(0.25 + colD / 2)], [w, upperH, colD]),
    // Recessed CRT: raised bezel strips with the shared arcadeScreen plane behind them.
    part('plane', 'arcadeScreen', [0, screenY, zc + 0.003], [sw, sh, 1]),
    bx('bezel', [0, screenY + sh / 2 + t / 2, zc + 0.015], [sw + 2 * t, t, 0.03]),
    bx('bezel', [0, screenY - sh / 2 - t / 2, zc + 0.015], [sw + 2 * t, t, 0.03]),
    bx('bezel', [-sw / 2 - t / 2, screenY, zc + 0.015], [t, sh, 0.03]),
    bx('bezel', [sw / 2 + t / 2, screenY, zc + 0.015], [t, sh, 0.03]),
    ...tiltX(deck, [0, 1.0, -0.22], 0.2),
    ...tiltX(marquee, [0, 1.68, -0.2], 0.25),
    ...side(1),
    ...side(-1),
    // Coin door and kick plate.
    bx('metal', [0, 0.48, 0.004], [0.26, 0.34, 0.012]),
    bx('bezel', [-0.05, 0.56, 0.01], [0.03, 0.06, 0.012]),
    bx('bezel', [0.05, 0.56, 0.01], [0.03, 0.06, 0.012]),
    bx('btnYellow', [-0.07, 0.41, 0.01], [0.04, 0.04, 0.012]),
    bx('btnYellow', [0.07, 0.41, 0.01], [0.04, 0.04, 0.012]),
    bx('metal', [0, 0.075, 0.004], [w * 0.98, 0.13, 0.012]),
  ]
  return offset(local, [cx, 0, box.maxZ])
}

// ---------------------------------------------------------------------------------------------
// Shelves (wooden frame as parts, tapes as per-shelf instanced data)
// ---------------------------------------------------------------------------------------------

export const SHELF_BOARD_YS = [0.05, 0.55, 1.0, 1.45, 1.95] as const
const TAPE_PITCH = 0.075
const TAPE_W = 0.03
const TAPE_D = 0.1
const TAPE_MIN_H = 0.16
const TAPE_MAX_H = 0.2

/** Deterministic spine palette (muted 1990s rental-store colours). */
export const TAPE_PALETTE = [
  '#a32a2a',
  '#2a4aa3',
  '#c9a02a',
  '#2a7a4a',
  '#d8d2b8',
  '#5a2a7a',
  '#d06a2a',
  '#1c1c22',
  '#2a8aa3',
  '#8a8a92',
] as const

export interface TapeInstance {
  pos: Vec3
  /** Spine box size in world axes. */
  size: Vec3
  paletteIndex: number
  labelPos: Vec3
  /** Y rotation that makes the label plane face the open side of the shelf. */
  labelRotY: number
}

/** Small deterministic PRNG (mulberry32) seeded from a string. */
export function seededRng(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface ShelfFrame {
  alongX: boolean
  len: number
  start: number
  /** Unit direction of the open side (away from the wall the shelf stands against). */
  open: readonly [number, number]
  backX: number
  backZ: number
}

function shelfFrame(box: Aabb): ShelfFrame {
  const b = ROOM.bounds
  const { cx, cz, w, d } = centre(box)
  const alongX = w > d
  if (alongX) {
    const backNorth = Math.abs(box.minZ - b.minZ) < Math.abs(box.maxZ - b.maxZ)
    return {
      alongX,
      len: w,
      start: box.minX,
      open: [0, backNorth ? 1 : -1],
      backX: cx,
      backZ: backNorth ? box.minZ + 0.02 : box.maxZ - 0.02,
    }
  }
  const backWest = Math.abs(box.minX - b.minX) < Math.abs(box.maxX - b.maxX)
  return {
    alongX,
    len: d,
    start: box.minZ,
    open: [backWest ? 1 : -1, 0],
    backX: backWest ? box.minX + 0.02 : box.maxX - 0.02,
    backZ: cz,
  }
}

export function shelfFrameParts(box: Aabb, height: number): Part[] {
  const f = shelfFrame(box)
  const { cx, cz, w, d } = centre(box)
  const parts: Part[] = []
  const boards = [...SHELF_BOARD_YS, height - 0.02]
  for (const y of boards) parts.push(bx('wood', [cx, y, cz], [w, 0.04, d]))
  parts.push(bx('woodDark', [f.backX, height / 2, f.backZ], f.alongX ? [f.len, height, 0.04] : [0.04, height, f.len]))
  // Four corner posts, 5 mm proud of the footprint so they never share a face with the boards.
  const post = 0.05
  for (const px of [box.minX + post / 2 - 0.005, box.maxX - post / 2 + 0.005]) {
    for (const pz of [box.minZ + post / 2 - 0.005, box.maxZ - post / 2 + 0.005]) {
      parts.push(bx('woodDark', [px, (height - 0.04) / 2, pz], [post, height - 0.04, post]))
    }
  }
  return parts
}

export function shelfTapes(id: string, box: Aabb): TapeInstance[] {
  const f = shelfFrame(box)
  const { cx, cz } = centre(box)
  const rnd = seededRng(id)
  const perBoard = Math.floor((f.len - 0.24) / TAPE_PITCH)
  const out: TapeInstance[] = []
  const rows = SHELF_BOARD_YS.length - 1
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < perBoard; i++) {
      // Always draw the random numbers so a skipped slot never shifts later tapes.
      const skip = rnd() < 0.12
      const hh = TAPE_MIN_H + rnd() * (TAPE_MAX_H - TAPE_MIN_H)
      const colour = Math.floor(rnd() * TAPE_PALETTE.length)
      if (skip) continue
      const tpos = f.start + 0.12 + i * TAPE_PITCH
      const y = SHELF_BOARD_YS[row] + 0.02 + hh / 2
      const px = f.alongX ? tpos : cx
      const pz = f.alongX ? cz : tpos
      const lift = TAPE_D / 2 + 0.001
      out.push({
        pos: [px, y, pz],
        size: f.alongX ? [TAPE_W, hh, TAPE_D] : [TAPE_D, hh, TAPE_W],
        paletteIndex: colour,
        labelPos: [px + f.open[0] * lift, y, pz + f.open[1] * lift],
        labelRotY: Math.atan2(f.open[0], f.open[1]),
      })
    }
  }
  return out
}

/** Label strip size (width, height) for a spine of height `h`. */
export const labelSize = (h: number): readonly [number, number] => [TAPE_W * 0.75, h * 0.6]

// ---------------------------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------------------------

export function armchairParts(box: Aabb): Part[] {
  const { cx, cz, w, d } = centre(box)
  const parts: Part[] = []
  const leg = 0.05
  for (const lx of [box.minX + leg / 2, box.maxX - leg / 2]) {
    for (const lz of [box.minZ + leg / 2, box.maxZ - leg / 2]) parts.push(bx('woodDark', [lx, 0.06, lz], [leg, 0.12, leg]))
  }
  parts.push(
    bx('fabric', [cx, 0.21, cz], [w, 0.18, d]),
    bx('fabricLight', [cx, 0.36, cz - 0.04], [w - 0.2, 0.12, d - 0.15]),
    // Back shell and tilted back cushion (back on the +z side).
    bx('fabric', [cx, 0.58, box.maxZ - 0.07], [w - 0.04, 0.6, 0.14]),
    bx('fabricLight', [cx, 0.6, box.maxZ - 0.17], [w - 0.24, 0.36, 0.1], [0.15, 0, 0]),
    bx('fabric', [box.minX + 0.05, 0.41, cz], [0.1, 0.22, d - 0.04]),
    bx('fabric', [box.maxX - 0.05, 0.41, cz], [0.1, 0.22, d - 0.04]),
  )
  return parts
}

export function couchParts(box: Aabb): Part[] {
  const { cx, cz, w, d } = centre(box)
  const parts: Part[] = []
  for (const lx of [box.minX + 0.08, box.maxX - 0.08]) {
    for (const lz of [box.minZ + 0.08, box.maxZ - 0.08]) parts.push(bx('woodDark', [lx, 0.04, lz], [0.06, 0.08, 0.06]))
  }
  parts.push(
    bx('rug', [cx, 0.18, cz], [w, 0.2, d]),
    // Backrest on the +z side.
    bx('rug', [cx, 0.555, box.maxZ - 0.1], [w - 0.4, 0.55, 0.2]),
    // Arms with rolled tops.
    bx('rug', [box.minX + 0.1, 0.45, cz], [0.2, 0.34, d]),
    bx('rug', [box.maxX - 0.1, 0.45, cz], [0.2, 0.34, d]),
    part('cylinder', 'rug', [box.minX + 0.1, 0.62, cz], [0.2, d, 0.2], [HALF_PI, 0, 0]),
    part('cylinder', 'rug', [box.maxX - 0.1, 0.62, cz], [0.2, d, 0.2], [HALF_PI, 0, 0]),
  )
  const inner = w - 0.4
  const sw = inner / 3 - 0.01
  const sd = d - 0.24
  const seatZ = box.minZ + 0.02 + sd / 2
  for (let i = 0; i < 3; i++) {
    const x = box.minX + 0.2 + (i + 0.5) * (inner / 3)
    parts.push(
      bx('rugLight', [x, 0.35, seatZ], [sw, 0.14, sd]),
      bx('rugLight', [x, 0.62, box.maxZ - 0.26], [sw, 0.4, 0.12], [0.12, 0, 0]),
    )
  }
  const midX = box.minX + 0.2 + 1.5 * (inner / 3)
  // Darker worn patch on the middle seat cushion and one on its back cushion.
  parts.push(
    bx('rugWorn', [midX, 0.422, seatZ - 0.08], [sw * 0.7, 0.004, sd * 0.5]),
    bx('rugWorn', [midX, 0.66, box.maxZ - 0.195], [sw * 0.5, 0.18, 0.004], [0.12, 0, 0]),
  )
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
    parts.push(bx('crate', [cx, y, cz], [w + 0.02, sh, d - 0.02]), bx('crate', [cx, y, cz], [w - 0.02, sh, d + 0.02]))
  }
  parts.push(bx('crateSlat', [cx, height - 0.012, cz], [w, 0.024, d]))
  const post = 0.05
  for (const px of [box.minX + post / 2 - 0.006, box.maxX - post / 2 + 0.006]) {
    for (const pz of [box.minZ + post / 2 - 0.006, box.maxZ - post / 2 + 0.006]) {
      parts.push(bx('crateSlat', [px, (height - 0.03) / 2, pz], [post, height - 0.03, post]))
    }
  }
  return parts
}

/** Reception desk (front on the +z side): panelled front, drawers, lamp, bell, book and archive box. */
export function deskParts(box: Aabb, height: number): Part[] {
  const { cx, cz, w, d } = centre(box)
  const top = height
  const lampX = box.minX + 0.3
  const f = box.maxZ
  return [
    bx('woodDark', [cx, (height - 0.06) / 2, cz], [w, height - 0.06, d]),
    bx('wood', [cx, top - 0.03, cz], [w + 0.1, 0.06, d + 0.1]),
    // Front: knee-space recess, drawer bank on the left, cabinet door on the right.
    bx('bezel', [cx, 0.45, f + 0.002], [1.1, 0.7, 0.004]),
    bx('wood', [cx - 1.0, 0.7, f + 0.006], [0.6, 0.22, 0.012]),
    bx('wood', [cx - 1.0, 0.4, f + 0.006], [0.6, 0.22, 0.012]),
    bx('wood', [cx + 1.0, 0.5, f + 0.006], [0.6, 0.7, 0.012]),
    bx('metal', [cx - 1.0, 0.7, f + 0.018], [0.14, 0.02, 0.02]),
    bx('metal', [cx - 1.0, 0.4, f + 0.018], [0.14, 0.02, 0.02]),
    bx('metal', [cx + 0.8, 0.5, f + 0.018], [0.02, 0.14, 0.02]),
    // Lamp: base, leaning stem, shade and bulb.
    part('cylinder', 'metal', [lampX, top + 0.015, cz], [0.16, 0.03, 0.16]),
    part('cylinderLow', 'metal', [lampX - 0.037, top + 0.175, cz], [0.025, 0.3, 0.025], [0, 0, 0.25]),
    part('cylinder', 'lampShade', [lampX - 0.074, top + 0.36, cz], [0.22, 0.12, 0.22]),
    part('sphere', 'bulb', [lampX - 0.074, top + 0.29, cz], [0.08, 0.08, 0.08]),
    // Service bell and guest book.
    part('cylinderLow', 'metal', [cx + 0.1, top + 0.01, cz + 0.15], [0.1, 0.02, 0.1]),
    part('sphere', 'metal', [cx + 0.1, top + 0.03, cz + 0.15], [0.07, 0.04, 0.07]),
    bx('rug', [cx - 0.6, top + 0.015, cz - 0.1], [0.28, 0.03, 0.2]),
    bx('tapeLabel', [cx - 0.6, top + 0.032, cz - 0.1], [0.25, 0.004, 0.17]),
    // Archive box with upright tapes.
    bx('crate', [cx + 0.5, top + 0.1, cz], [0.4, 0.2, 0.3]),
    bx('crateSlat', [cx + 0.5, top + 0.2, cz + 0.14], [0.42, 0.02, 0.02]),
    bx('spineA', [cx + 0.4, top + 0.22, cz], [0.03, 0.19, 0.1]),
    bx('spineB', [cx + 0.45, top + 0.22, cz], [0.03, 0.19, 0.1]),
    bx('spineC', [cx + 0.5, top + 0.22, cz], [0.03, 0.19, 0.1]),
    bx('spineA', [cx + 0.55, top + 0.22, cz], [0.03, 0.19, 0.1]),
    // Two loose tapes with labels.
    bx('tapeBlack', [cx - 0.2, top + 0.015, cz + 0.05], [0.19, 0.03, 0.1]),
    bx('tapeBlack', [cx - 0.2, top + 0.045, cz + 0.05], [0.19, 0.03, 0.1]),
    bx('tapeLabel', [cx - 0.2, top + 0.0605, cz + 0.05], [0.1, 0.002, 0.06]),
  ]
}

// ---------------------------------------------------------------------------------------------
// Room dressing: ceiling fluorescent fixtures, skirting and ceiling trim
// ---------------------------------------------------------------------------------------------

export const FIXTURE_LENGTH = 1.2
export const FIXTURE_WIDTH = 0.22

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

// ---------------------------------------------------------------------------------------------
// Counting helpers (pure)
// ---------------------------------------------------------------------------------------------

export function countTriangles(parts: readonly Part[]): number {
  return parts.reduce((n, p) => n + GEOMETRY_TRIANGLES[p.geo], 0)
}

/** Draw calls after grouping by geometry + material (one InstancedMesh or Mesh per group). */
export function countDrawCalls(parts: readonly Part[]): number {
  return new Set(parts.map((p) => `${p.geo}|${p.mat}`)).size
}

export interface SceneDetailReport {
  objects: ReadonlyArray<{ name: string; triangles: number; drawCalls: number }>
  /** Triangles of the declared decorative parts, tapes included. Floor, ceiling, wall and door blocks add `baseTriangles`. */
  detailTriangles: number
  baseTriangles: number
  baseDrawCalls: number
  totalTriangles: number
  totalDrawCalls: number
  tapeCount: number
}

/** Every declared object, built from the layout. Order matches the component tree. */
export function declaredObjects(): Array<{ name: string; parts: Part[]; extraTriangles?: number; extraDrawCalls?: number }> {
  const prop = (id: string) => {
    const p = ROOM.props.find((q) => q.id === id)
    if (!p) throw new Error(`Missing prop ${id}`)
    return p
  }
  const crt = prop('crt-vhs')
  const arcade = prop('arcade-cabinet')
  const objects: Array<{ name: string; parts: Part[]; extraTriangles?: number; extraDrawCalls?: number }> = [
    { name: 'crt-television', parts: crtTelevisionParts(crt.box, crt.height) },
    { name: 'vcr-deck', parts: vcrDeckParts(crt.box) },
    { name: 'arcade-cabinet', parts: arcadeCabinetParts(arcade.box, arcade.height) },
    { name: 'desk', parts: deskParts(prop('reception-desk').box, prop('reception-desk').height) },
    { name: 'armchair', parts: armchairParts(prop('abandoned-chair').box) },
    { name: 'couch', parts: couchParts(prop('couch').box) },
    { name: 'crate-a', parts: crateParts(prop('crate-a').box, prop('crate-a').height) },
    { name: 'crate-b', parts: crateParts(prop('crate-b').box, prop('crate-b').height) },
    { name: 'trim', parts: trimParts() },
    ...fixtureCentres().map(([x, z], i) => ({ name: `fixture-${i}`, parts: ceilingFixtureParts(x, z) })),
  ]
  for (const id of ['shelf-a', 'shelf-b', 'shelf-c']) {
    const p = prop(id)
    const tapes = shelfTapes(id, p.box).length
    // One spine InstancedMesh (box, 12 tris) and one label InstancedMesh (plane, 2 tris) per shelf.
    objects.push({
      name: id,
      parts: shelfFrameParts(p.box, p.height),
      extraTriangles: tapes * (GEOMETRY_TRIANGLES.box + GEOMETRY_TRIANGLES.plane),
      extraDrawCalls: 2,
    })
  }
  return objects
}

/** Base room meshes that Room.tsx and Props.tsx still draw as plain boxes/planes (no instancing). */
function baseRoomCounts() {
  const frames = ROOM.doors.reduce((n, d) => n + d.frames.length, 0)
  const doorBlocks = frames + ROOM.doors.length // jambs + lintel
  const boxes = ROOM.walls.length + doorBlocks + 3 /* tape stack */ + 1 /* cable */
  // planes: floor, ceiling, thresholds, rug, 2 posters x 2 layers, 4 shift overlays
  const planes = 2 + ROOM.doors.length + 1 + 4 + 4
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
  const tapeCount = ['shelf-a', 'shelf-b', 'shelf-c'].reduce((n, id) => {
    const p = ROOM.props.find((q) => q.id === id)
    return n + (p ? shelfTapes(id, p.box).length : 0)
  }, 0)
  return {
    objects,
    detailTriangles,
    baseTriangles,
    baseDrawCalls: baseRoomDrawCalls(),
    totalTriangles: detailTriangles + baseTriangles,
    totalDrawCalls: baseRoomDrawCalls() + objects.reduce((n, o) => n + o.drawCalls, 0),
    tapeCount,
  }
}
