/**
 * Bookcases (task 18.2): a solid wood carcass as parts, and books and VHS slipcases as instance data.
 * Pure data, no three.js: modelDetail.ts re-exports everything here and counts it in the scene report.
 * Layout stays the single source of truth: the carcass is derived from the shelf footprint and height.
 */
import { ROOM } from '../layout/roomLayout'
import type { Aabb } from '../worldTypes'
import type { MaterialKey, Part, Vec3 } from './modelDetail'
import { SPINE_BOOK_VARIANTS, SPINE_CASE_VARIANTS } from './proceduralTextures'

const bx = (mat: MaterialKey, pos: Vec3, scale: Vec3): Part => ({ geo: 'box', mat, pos, scale })

const centre = (b: Aabb) => ({ cx: (b.minX + b.maxX) / 2, cz: (b.minZ + b.maxZ) / 2, w: b.maxX - b.minX, d: b.maxZ - b.minZ })

/** Deterministic slipcase palette (muted 1990s rental-store colours). */
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

/** Deterministic book palette: cloth and paper covers. Multiplied with the light spine atlas. */
export const BOOK_PALETTE = [
  '#7a2a2a',
  '#2a3f6a',
  '#3a5a3a',
  '#a07a2a',
  '#d8cfb0',
  '#5a4030',
  '#2f5a60',
  '#2a2a30',
  '#6a3a58',
  '#a0522d',
  '#8a8a74',
  '#4a2a1c',
] as const

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
  /** Unit direction of the open side (away from the wall the shelf stands against). */
  open: readonly [number, number]
}

function shelfFrame(box: Aabb): ShelfFrame {
  const b = ROOM.bounds
  const { w, d } = centre(box)
  const alongX = w > d
  if (alongX) {
    const backNorth = Math.abs(box.minZ - b.minZ) < Math.abs(box.maxZ - b.maxZ)
    return { alongX, len: w, open: [0, backNorth ? 1 : -1] }
  }
  const backWest = Math.abs(box.minX - b.minX) < Math.abs(box.maxX - b.maxX)
  return { alongX, len: d, open: [backWest ? 1 : -1, 0] }
}

// Carcass dimensions in metres. The carcass is derived from the layout footprint and never exceeds it.
export const SHELF_IDS = ['shelf-a', 'shelf-b', 'shelf-c'] as const
export const SHELF_LEVELS = 4
export const SHELF_SIDE_T = 0.045
export const SHELF_BOARD_T = 0.03
const SHELF_TOP_T = 0.035
const SHELF_BACK_T = 0.02
/** Plinth 0.09 + base moulding 0.03: the body (sides, back, boards) starts here. */
const SHELF_BASE_H = 0.12
/** Stepped cornice on top: fillet 0.035 + crown 0.04 + cap 0.035. */
const SHELF_CORNICE_H = 0.11
/** Top of the lowest board. */
const SHELF_FLOOR0 = 0.15

export interface ShelfLevel {
  /** Y of the board top the books stand on. */
  floor: number
  /** Y of the underside of the board (or top panel) above. */
  ceil: number
}

/**
 * Bookcase geometry in a local frame: x runs along the shelf as seen from the open side (right = +x),
 * z points to the open side (back panel at -z), y is up. `yaw` rotates the local frame into the world
 * (it is the same yaw the books use as their facing), `cx, cz` is the footprint centre.
 */
export interface ShelfGeometry {
  alongX: boolean
  yaw: number
  cx: number
  cz: number
  height: number
  /** Footprint length along local x and depth along local z. */
  len: number
  depth: number
  /** Body (sides and back, inside the cornice and plinth) in local z. */
  zBack: number
  zFront: number
  bodyW: number
  bodyTop: number
  /** Free interior in local coordinates: between the side panels, in front of the back panel. */
  inner: { u0: number; u1: number; z0: number; z1: number }
  levels: ShelfLevel[]
}

export function shelfGeometry(box: Aabb, height: number): ShelfGeometry {
  const f = shelfFrame(box)
  const { cx, cz, w, d } = centre(box)
  const len = f.alongX ? w : d
  const depth = f.alongX ? d : w
  const bodyW = len - 0.02
  const zBack = -depth / 2 + 0.005
  const zFront = depth / 2 - 0.01
  const bodyTop = height - SHELF_CORNICE_H
  const topUnder = bodyTop - SHELF_TOP_T
  const pitch = (topUnder + SHELF_BOARD_T - SHELF_FLOOR0) / SHELF_LEVELS
  const levels: ShelfLevel[] = []
  for (let i = 0; i < SHELF_LEVELS; i++) {
    const floor = SHELF_FLOOR0 + i * pitch
    levels.push({ floor, ceil: floor + pitch - SHELF_BOARD_T })
  }
  const li = bodyW - 2 * SHELF_SIDE_T
  return {
    alongX: f.alongX,
    yaw: Math.atan2(f.open[0], f.open[1]),
    cx,
    cz,
    height,
    len,
    depth,
    zBack,
    zFront,
    bodyW,
    bodyTop,
    inner: { u0: -li / 2, u1: li / 2, z0: zBack + SHELF_BACK_T, z1: zFront - 0.005 },
    levels,
  }
}

const snap = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v)

/** Local shelf coordinates to world (yaw is a multiple of 90 degrees, so the result is exact). */
export function shelfLocalToWorld(g: ShelfGeometry, lx: number, y: number, lz: number): Vec3 {
  const c = snap(Math.cos(g.yaw))
  const s = snap(Math.sin(g.yaw))
  return [g.cx + lx * c + lz * s, y, g.cz - lx * s + lz * c]
}

/** Axis-aligned world box of a local shelf region, as an Aabb plus the y range. */
export function shelfInnerBounds(box: Aabb, height: number): Aabb & { levels: ShelfLevel[] } {
  const g = shelfGeometry(box, height)
  const a = shelfLocalToWorld(g, g.inner.u0, 0, g.inner.z0)
  const b = shelfLocalToWorld(g, g.inner.u1, 0, g.inner.z1)
  return {
    minX: Math.min(a[0], b[0]),
    maxX: Math.max(a[0], b[0]),
    minZ: Math.min(a[2], b[2]),
    maxZ: Math.max(a[2], b[2]),
    levels: g.levels,
  }
}

/** A box in the local shelf frame; sx runs along local x, sz along local z. */
function localPart(g: ShelfGeometry, mat: MaterialKey, lx: number, y: number, lz: number, sx: number, sy: number, sz: number): Part {
  const part = bx(mat, shelfLocalToWorld(g, lx, y, lz), g.alongX ? [sx, sy, sz] : [sz, sy, sx])
  // Wood boards get metric UVs (task 19.2): the grain tiles along the longest axis instead of stretching.
  return mat === 'wood' || mat === 'woodDark' ? { ...part, metric: true } : part
}

/**
 * Solid wood carcass: plinth, base moulding, two thick side panels, a solid back panel, four boards, a top
 * panel and a three-step cornice. All boxes, all on the textured wood materials, all inside the footprint.
 */
export function shelfFrameParts(box: Aabb, height: number): Part[] {
  const g = shelfGeometry(box, height)
  const { len, depth, zBack, zFront, bodyW, bodyTop, inner } = g
  const bodyH = bodyTop - SHELF_BASE_H
  const bodyY = SHELF_BASE_H + bodyH / 2
  const bodyZ = (zBack + zFront) / 2
  const bodyD = zFront - zBack
  const innerW = inner.u1 - inner.u0
  const boardZ0 = zBack + SHELF_BACK_T
  const boardZ1 = zFront - 0.005
  const p = (mat: MaterialKey, lx: number, y: number, lz: number, sx: number, sy: number, sz: number) => localPart(g, mat, lx, y, lz, sx, sy, sz)
  const parts: Part[] = [
    // Plinth (toe-kick recess at the front) and a full-footprint base moulding.
    p('woodDark', 0, 0.045, (-depth / 2 + 0.01 + depth / 2 - 0.04) / 2, len - 0.04, 0.09, depth - 0.05),
    p('wood', 0, 0.105, 0, len, 0.03, depth),
    // Side panels, 4.5 cm thick, and the back panel (tucked 2 mm in from the back face).
    p('wood', -(bodyW / 2 - SHELF_SIDE_T / 2), bodyY, bodyZ, SHELF_SIDE_T, bodyH, bodyD),
    p('wood', bodyW / 2 - SHELF_SIDE_T / 2, bodyY, bodyZ, SHELF_SIDE_T, bodyH, bodyD),
    p('woodDark', 0, bodyY, zBack + 0.002 + (SHELF_BACK_T - 0.002) / 2, innerW + 0.01, bodyH, SHELF_BACK_T - 0.002),
  ]
  // Four boards: the top of board i is the floor of level i.
  for (const lv of g.levels) {
    parts.push(p('wood', 0, lv.floor - SHELF_BOARD_T / 2, (boardZ0 + boardZ1) / 2, innerW + 0.004, SHELF_BOARD_T, boardZ1 - boardZ0))
  }
  parts.push(
    // Top panel flush with the body top.
    p('wood', 0, bodyTop - SHELF_TOP_T / 2, (boardZ0 + boardZ1) / 2, innerW + 0.004, SHELF_TOP_T, boardZ1 - boardZ0),
    // Stepped cornice: fillet, overhanging crown, cap.
    p('wood', 0, bodyTop + 0.0175, bodyZ, bodyW, 0.035, bodyD),
    p('woodDark', 0, bodyTop + 0.055, 0, len, 0.04, depth),
    p('wood', 0, bodyTop + 0.0925, 0, len - 0.04, 0.035, depth - 0.04),
  )
  return parts
}

// ---------------------------------------------------------------------------------------------
// Books and slipcases
// ---------------------------------------------------------------------------------------------

export type BookKind = 'book' | 'slipcase'
export type BookGroup = 'row' | 'lean' | 'stack' | 'boxed'

export const BOOK_HEIGHT_RANGE = [0.18, 0.3] as const
export const BOOK_THICKNESS_RANGE = [0.02, 0.06] as const
export const LEAN_ANGLE_RANGE_DEG = [10, 18] as const
/** VHS slipcase, spine out: about 0.19 m tall and 0.105 m deep. */
export const SLIPCASE_HEIGHT = 0.19
export const SLIPCASE_DEPTH = 0.105

export interface BookInstance {
  kind: BookKind
  group: BookGroup
  /** Shelf level 0..3 from the bottom. */
  level: number
  /** Spine variant 0..5 (see proceduralTextures.ts): the shared unit-box geometry for this variant. */
  variant: number
  /** Index into BOOK_PALETTE (books) or TAPE_PALETTE (slipcases). */
  colorIndex: number
  /** World position of the box centre. */
  pos: Vec3
  /** Scale in the box's own axes: thickness (x), height (y), depth (z). The spine is the +z face. */
  size: Vec3
  /** Euler XYZ radians: yaw to face the open side, plus the lean about the depth axis. */
  rot: Vec3
  /** Lean angle in degrees from vertical; 0 unless group is 'lean'. */
  tiltDeg: number
}

export const instanceColour = (b: BookInstance): string => (b.kind === 'book' ? BOOK_PALETTE[b.colorIndex] : TAPE_PALETTE[b.colorIndex])

/** Horizontal and vertical reach of a book (thickness t, height h) leaning by `deg` on its bottom corner. */
export function leanFootprint(t: number, h: number, deg: number): { minU: number; maxU: number; height: number } {
  const th = (deg * Math.PI) / 180
  return { minU: -t * Math.cos(th), maxU: h * Math.sin(th), height: h * Math.cos(th) + t * Math.sin(th) }
}

/** Largest book height that, leaning by `deg`, still fits under `maxHeight`. */
export function clampLeanHeight(t: number, deg: number, maxHeight: number, h: number): number {
  const th = (deg * Math.PI) / 180
  return Math.min(h, (maxHeight - t * Math.sin(th)) / Math.cos(th))
}

/** Half extents of an oriented box (Euler XYZ, as three.js): the world AABB is centre +- these. */
export function orientedHalfExtents(size: Vec3, rot: Vec3): Vec3 {
  const [rx, ry, rz] = rot
  const a = Math.cos(rx)
  const b = Math.sin(rx)
  const c = Math.cos(ry)
  const d = Math.sin(ry)
  const e = Math.cos(rz)
  const f = Math.sin(rz)
  // Rows of R = Rx * Ry * Rz.
  const m = [
    [c * e, -c * f, d],
    [a * f + b * e * d, a * e - b * f * d, -b * c],
    [b * f - a * e * d, b * e + a * f * d, a * c],
  ]
  const hx = size[0] / 2
  const hy = size[1] / 2
  const hz = size[2] / 2
  return [0, 1, 2].map((i) => Math.abs(m[i][0]) * hx + Math.abs(m[i][1]) * hy + Math.abs(m[i][2]) * hz) as unknown as Vec3
}

export interface ShelfContents {
  instances: BookInstance[]
  /** Cardboard tape boxes (plain parts, rendered with the carcass). */
  boxParts: Part[]
}

const DEG = Math.PI / 180

/**
 * Deterministic contents of one bookcase (seeded by the id, no Math.random): per level a row of books and
 * slipcases of varied heights, thicknesses and depths, with gaps, 1 to 2 books leaning on a neighbour,
 * horizontal stacks and a few boxes of loose tapes. Planned features (lean, stack, box) are placed at
 * random positions along each level so every bookcase has at least one stack.
 */
export function shelfContents(id: string, box: Aabb, height: number): ShelfContents {
  const g = shelfGeometry(box, height)
  const rnd = seededRng(`${id}:books`)
  const range = (lo: number, hi: number) => lo + (hi - lo) * rnd()
  const instances: BookInstance[] = []
  const boxParts: Part[] = []
  const { u0, u1, z0, z1 } = g.inner
  // Spines line up near the front, but never deeper than 0.34 m from the back panel (deep bookcases keep a ledge).
  const frontLine = Math.min(z1 - 0.02, z0 + 0.34)
  const lastColour: Record<BookKind, number> = { book: -1, slipcase: -1 }
  const colour = (kind: BookKind): number => {
    const n = kind === 'book' ? BOOK_PALETTE.length : TAPE_PALETTE.length
    let i = Math.floor(rnd() * n)
    if (i === lastColour[kind]) i = (i + 1) % n
    lastColour[kind] = i
    return i
  }
  const bookVariant = () => SPINE_BOOK_VARIANTS[Math.floor(rnd() * SPINE_BOOK_VARIANTS.length)]
  const caseVariant = () => SPINE_CASE_VARIANTS[Math.floor(rnd() * SPINE_CASE_VARIANTS.length)]

  /** Front z of an item (pulled back a little now and then) and its depth, clamped to stay in front of the back panel. */
  const front = (depth: number, backMargin = 0.004) => {
    const slide = rnd() < 0.12 ? 0.02 + 0.03 * rnd() : 0.008 * rnd()
    const zf = frontLine - slide
    return { zf, d: Math.min(depth, zf - z0 - backMargin) }
  }
  const add = (o: {
    kind: BookKind
    group: BookGroup
    level: number
    variant: number
    lx: number
    y: number
    lz: number
    size: Vec3
    rotZ: number
    yawExtra?: number
    tiltDeg?: number
  }) => {
    instances.push({
      kind: o.kind,
      group: o.group,
      level: o.level,
      variant: o.variant,
      colorIndex: colour(o.kind),
      pos: shelfLocalToWorld(g, o.lx, o.y, o.lz),
      size: o.size,
      rot: [0, g.yaw + (o.yawExtra ?? 0), o.rotZ],
      tiltDeg: o.tiltDeg ?? 0,
    })
  }
  const bookDims = (variant: number) => {
    const t0 = BOOK_THICKNESS_RANGE[0] + (BOOK_THICKNESS_RANGE[1] - BOOK_THICKNESS_RANGE[0]) * Math.pow(rnd(), 1.4)
    return {
      t: variant === 1 ? Math.min(BOOK_THICKNESS_RANGE[1], t0 + 0.008) : t0,
      h: range(BOOK_HEIGHT_RANGE[0], BOOK_HEIGHT_RANGE[1]),
      d: range(0.16, 0.28),
    }
  }
  const slipDims = () => ({ t: range(0.026, 0.038), h: SLIPCASE_HEIGHT + range(-0.004, 0.004), d: SLIPCASE_DEPTH })
  const gap = () => (rnd() < 0.1 ? range(0.004, 0.014) : range(0.0005, 0.002))

  const stackLevel = Math.floor(rnd() * SHELF_LEVELS)
  const boxLevel = Math.floor(rnd() * SHELF_LEVELS)

  g.levels.forEach((lv, level) => {
    const { floor } = lv
    const cellH = lv.ceil - lv.floor
    const end = u1 - 0.004
    let cur = u0 + 0.004 + rnd() * 0.01
    const pending: Array<{ at: number; kind: 'lean' | 'stack' | 'box' }> = []
    const frac = () => u0 + (u1 - u0) * (0.05 + 0.65 * rnd())
    const leans = 1 + (rnd() < 0.5 ? 1 : 0)
    for (let i = 0; i < leans; i++) pending.push({ at: frac(), kind: 'lean' })
    if (level === stackLevel || rnd() < 0.3) pending.push({ at: frac(), kind: 'stack' })
    if (level === boxLevel || rnd() < 0.1) pending.push({ at: frac(), kind: 'box' })
    pending.sort((a, b) => a.at - b.at)

    const upright = (kind: BookKind, variant: number, t: number, h: number, d: number, left: number) => {
      const f = front(d)
      add({ kind, group: 'row', level, variant, lx: left + t / 2, y: floor + h / 2, lz: f.zf - f.d / 2, size: [t, h, f.d], rotZ: 0 })
    }

    /** A book leaning on its bottom corner against the next book (or the next feature). Returns the new cursor or null. */
    const placeLean = (): number | null => {
      const deg = range(LEAN_ANGLE_RANGE_DEG[0], LEAN_ANGLE_RANGE_DEG[1])
      const t = range(0.025, 0.05)
      const h = clampLeanHeight(t, deg, cellH - 0.01, range(0.2, 0.26))
      const variant = bookVariant()
      const fp = leanFootprint(t, h, deg)
      const pivot = cur - fp.minU
      const right = pivot + fp.maxU
      const nT = range(0.025, 0.05)
      const nH = range(0.2, BOOK_HEIGHT_RANGE[1])
      const nD = range(0.16, 0.28)
      const nVariant = bookVariant()
      if (right + 0.001 + nT > end) return null
      const th = deg * DEG
      const f = front(range(0.16, 0.28))
      add({
        kind: 'book',
        group: 'lean',
        level,
        variant,
        lx: pivot + (-t / 2) * Math.cos(th) + (h / 2) * Math.sin(th),
        y: floor + (t / 2) * Math.sin(th) + (h / 2) * Math.cos(th),
        lz: f.zf - f.d / 2,
        size: [t, h, f.d],
        rotZ: -th,
        tiltDeg: deg,
      })
      // The neighbour is at least as tall as the contact corner, so the lean really rests on it.
      const contact = h * Math.cos(th)
      upright('book', nVariant, nT, Math.min(BOOK_HEIGHT_RANGE[1], Math.max(nH, contact + 0.012)), nD, right + 0.0005)
      return right + 0.0005 + nT + 0.001
    }

    /** 2 to 4 books lying flat, spines out, slightly offset and yawed. */
    const placeStack = (): number | null => {
      const n = 2 + Math.floor(rnd() * 3)
      const layers = Array.from({ length: n }, () => ({
        len: range(0.19, 0.27),
        t: range(0.03, 0.05),
        d: range(0.15, 0.24),
        ju: range(-0.012, 0.012),
        yaw: range(-0.06, 0.06),
        variant: bookVariant(),
      }))
      const w = Math.max(...layers.map((l) => l.len)) + 0.05
      if (cur + w > end) return null
      let acc = 0
      layers.forEach((l, i) => {
        const f = front(l.d, 0.015)
        add({
          kind: 'book',
          group: 'stack',
          level,
          variant: l.variant,
          lx: cur + w / 2 + l.ju,
          y: floor + acc + l.t / 2,
          lz: f.zf - f.d / 2,
          size: [l.t, l.len, f.d],
          rotZ: (level + i) % 2 ? Math.PI / 2 : -Math.PI / 2,
          yawExtra: l.yaw,
        })
        acc += l.t
      })
      return cur + w + 0.003
    }

    /** An open cardboard box with six loose slipcases standing in it. */
    const placeBox = (): number | null => {
      const W = 0.34
      const wall = 0.008
      const wallH = 0.09
      if (cur + W > end) return null
      const zf = frontLine - 0.005
      const bd = Math.min(0.17, zf - z0 - 0.01)
      const zc = zf - bd / 2
      const cx = cur + W / 2
      const p = (lx: number, y: number, lz: number, sx: number, sy: number, sz: number) => boxParts.push(localPart(g, 'crate', lx, y, lz, sx, sy, sz))
      p(cx, floor + wall / 2, zc, W - 2 * wall, wall, bd - 2 * wall)
      p(cur + wall / 2, floor + wallH / 2, zc, wall, wallH, bd)
      p(cur + W - wall / 2, floor + wallH / 2, zc, wall, wallH, bd)
      p(cx, floor + wallH / 2, zf - bd + wall / 2, W - 2 * wall, wallH, wall)
      p(cx, floor + wallH / 2, zf - wall / 2, W - 2 * wall, wallH, wall)
      for (let i = 0; i < 6; i++) {
        const s = slipDims()
        add({
          kind: 'slipcase',
          group: 'boxed',
          level,
          variant: caseVariant(),
          lx: cur + 0.018 + 0.015 + i * 0.048 + 0.01,
          y: floor + wall + s.h / 2,
          lz: zf - wall - 0.012 - range(0, 0.012) - s.d / 2,
          size: [s.t, s.h, s.d],
          rotZ: 0,
          yawExtra: range(-0.05, 0.05),
        })
      }
      return cur + W + 0.004
    }

    while (cur < end - 0.03) {
      let moved = false
      while (pending.length && cur >= pending[0].at) {
        const feature = pending.shift()!
        const next = feature.kind === 'lean' ? placeLean() : feature.kind === 'stack' ? placeStack() : placeBox()
        if (next !== null) {
          cur = next
          moved = true
        }
      }
      if (cur >= end - 0.03) break
      const slip = rnd() < 0.35
      const count = slip ? 2 + Math.floor(rnd() * 6) : 3 + Math.floor(rnd() * 8)
      let placed = 0
      for (let i = 0; i < count; i++) {
        const variant = slip ? caseVariant() : bookVariant()
        const dims = slip ? slipDims() : bookDims(variant)
        if (cur + dims.t > end) break
        upright(slip ? 'slipcase' : 'book', variant, dims.t, dims.h, dims.d, cur)
        cur += dims.t + gap()
        placed++
      }
      if (placed === 0 && !moved) break
      if (rnd() < 0.35) cur += range(0.02, 0.12)
    }
  })
  return { instances, boxParts }
}
