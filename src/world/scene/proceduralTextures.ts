/**
 * Pure drawing helpers for the procedural textures (task 15.7). No three.js, React or DOM imports:
 * every function draws onto a minimal 2D-context interface, so tests run them against a recording
 * fake. The same seed always produces the same call sequence (seeded mulberry32, no Math.random).
 *
 * Texture budget (all power-of-two, estimate = width * height * 4 bytes, x 1.33 when mipmapped):
 *   signFace     512x128 mip       0.33 MB     posterSunset 256x512 mip  0.70 MB
 *   posterReel, shiftPoster 256x512 mip 0.70 MB each     shiftPlaque 256x128 mip 0.17 MB
 *   floor, wood, woodDark, crate, grille: 128x128 mip, 0.09 MB each     spineAtlas 512x256 mip 0.67 MB (task 18.2).
 *   Task 18.3: corkBoard (512x512 mip 1.33 MB, shrunk to 256x256 mip 0.33 MB in task 22.1), rugWoven 256x256 mip 0.33 MB, lampGlow 64x64 mip 0.02 MB (task 23.1: 128x128 mip 0.08 MB, radial gradient).
 *   Task 19.2: wallPanel 256x256 mip 0.33 MB, smpteBars 256x128 nearest 0.13 MB, timecode 128x32 nearest 0.02 MB.
 *   Task 20.2: three attract screens 256x256 nearest 0.25 MB each and three marquees 256x64 nearest 0.06 MB each
 *   replace the old arcadeScreen, marquee, outOfOrder and deck textures.
 *   Task 21.1: couchFabric 256x256 mip 0.33 MB.
 *   Task 21.2: crtCasing 256x256 mip 0.33 MB, crtGlass 256x256 nearest 0.25 MB.
 *   Task 22.1: vcrDeck 256x128 mip 0.17 MB, vhsShell 128x128 mip 0.08 MB.
 *   Task 22.2: metalCabinet 256x256 mip 0.33 MB (new), crate 128x128 -> 256x256 mip 0.33 MB (+0.25 MB).
 *   Task 22.2 part B: deskDetail 128x64 mip 0.04 MB (notebook cover grain and ruled paper).
 *   Task 27.1: cabinetAndManualDetail 256x128 mip 0.17 MB (arcade coin door, kick plate and control-deck legends; three manual spines).
 *   The total is checked against TEXTURE_MEMORY_BUDGET_BYTES in tests.
 */
import { makeRng } from './effectsTiming'

/** The part of a gradient the helpers use. CanvasGradient satisfies it. */
export interface GradientLike {
  addColorStop(offset: number, color: string): void
}

/**
 * The subset of CanvasRenderingContext2D used here. Style properties are `unknown` on purpose so the
 * real context (whose fillStyle may also hold a pattern) is assignable; helpers only ever write them.
 */
export interface Ctx2D {
  fillStyle: unknown
  strokeStyle: unknown
  lineWidth: number
  font: string
  textAlign: string
  textBaseline: string
  globalAlpha: number
  fillRect(x: number, y: number, w: number, h: number): void
  strokeRect(x: number, y: number, w: number, h: number): void
  clearRect(x: number, y: number, w: number, h: number): void
  beginPath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  closePath(): void
  fill(): void
  stroke(): void
  fillText(text: string, x: number, y: number): void
  arc(x: number, y: number, r: number, start: number, end: number): void
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): GradientLike
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): GradientLike
  save(): void
  restore(): void
  setTransform?(a: number, b: number, c: number, d: number, e: number, f: number): void
}

export type TextureId =
  | 'attractSnake'
  | 'attractMaze'
  | 'attractFrequency'
  | 'marqueeSnake'
  | 'marqueeMaze'
  | 'marqueeFrequency'
  | 'signFace'
  | 'posterSunset'
  | 'posterReel'
  | 'shiftPoster'
  | 'shiftPlaque'
  | 'floor'
  | 'wood'
  | 'woodDark'
  | 'crate'
  | 'grille'
  | 'spineAtlas'
  | 'wallPanel'
  | 'rugWoven'
  | 'corkBoard'
  | 'lampGlow'
  | 'smpteBars'
  | 'timecode'
  | 'couchFabric'
  | 'crtCasing'
  | 'crtGlass'
  | 'vcrDeck'
  | 'vhsShell'
  | 'metalCabinet'
  | 'deskDetail'
  | 'coneFalloff'
  | 'cabinetAndManualDetail'

export type TextureFilter = 'nearest' | 'mipmap' | 'linear'

export interface TextureSpec {
  id: TextureId
  width: number
  height: number
  /** `nearest` = pixel art, no mipmaps. `mipmap` = linear with mipmaps. `linear` = smooth, no mipmaps (task 25.1 coneFalloff). */
  filter: TextureFilter
  wrap: 'clamp' | 'repeat'
  seed: number
  draw(ctx: Ctx2D, w: number, h: number, seed: number): void
}

/** Floor tile pattern covers this many metres per texture repeat. */
export const FLOOR_METRES_PER_REPEAT = 2
/** Texture memory limit from the task budget. */
export const TEXTURE_MEMORY_BUDGET_BYTES = 8 * 1024 * 1024

const TAU = Math.PI * 2

// ---------------------------------------------------------------------------------------------
// Small drawing helpers
// ---------------------------------------------------------------------------------------------

function rect(c: Ctx2D, x: number, y: number, w: number, h: number, color: string, alpha = 1): void {
  c.globalAlpha = alpha
  c.fillStyle = color
  c.fillRect(x, y, w, h)
  c.globalAlpha = 1
}

function disc(c: Ctx2D, x: number, y: number, r: number, color: string, alpha = 1): void {
  c.globalAlpha = alpha
  c.fillStyle = color
  c.beginPath()
  c.arc(x, y, r, 0, TAU)
  c.fill()
  c.globalAlpha = 1
}

function ring(c: Ctx2D, x: number, y: number, r: number, color: string, lw: number, alpha = 1): void {
  c.globalAlpha = alpha
  c.strokeStyle = color
  c.lineWidth = lw
  c.beginPath()
  c.arc(x, y, r, 0, TAU)
  c.stroke()
  c.globalAlpha = 1
}

function line(c: Ctx2D, x0: number, y0: number, x1: number, y1: number, color: string, lw: number, alpha = 1): void {
  c.globalAlpha = alpha
  c.strokeStyle = color
  c.lineWidth = lw
  c.beginPath()
  c.moveTo(x0, y0)
  c.lineTo(x1, y1)
  c.stroke()
  c.globalAlpha = 1
}

function frame(c: Ctx2D, x: number, y: number, w: number, h: number, color: string, lw: number, alpha = 1): void {
  c.globalAlpha = alpha
  c.strokeStyle = color
  c.lineWidth = lw
  c.strokeRect(x, y, w, h)
  c.globalAlpha = 1
}

function triangle(c: Ctx2D, pts: ReadonlyArray<readonly [number, number]>, color: string, alpha = 1): void {
  c.globalAlpha = alpha
  c.fillStyle = color
  c.beginPath()
  c.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1])
  c.closePath()
  c.fill()
  c.globalAlpha = 1
}

function text(c: Ctx2D, s: string, x: number, y: number, font: string, color: string, alpha = 1, align = 'center'): void {
  c.globalAlpha = alpha
  c.font = font
  c.textAlign = align
  c.textBaseline = 'middle'
  c.fillStyle = color
  c.fillText(s, x, y)
  c.globalAlpha = 1
}

type Stops = ReadonlyArray<readonly [number, string]>

/** Fills a rectangle with a linear gradient along the line (gx0,gy0) to (gx1,gy1). */
function gradientRect(
  c: Ctx2D,
  x: number,
  y: number,
  w: number,
  h: number,
  gx0: number,
  gy0: number,
  gx1: number,
  gy1: number,
  stops: Stops,
  alpha = 1,
): void {
  const g = c.createLinearGradient(gx0, gy0, gx1, gy1)
  for (const [o, col] of stops) g.addColorStop(o, col)
  c.globalAlpha = alpha
  c.fillStyle = g
  c.fillRect(x, y, w, h)
  c.globalAlpha = 1
}

const vertical = (c: Ctx2D, w: number, h: number, stops: Stops) => gradientRect(c, 0, 0, w, h, 0, 0, 0, h, stops)

function scanlines(c: Ctx2D, w: number, h: number, step: number, alpha: number): void {
  for (let y = 0; y < h; y += step) rect(c, 0, y, w, 1, '#000000', alpha)
}

/** Darkens the four edges with linear gradients (no radial gradient needed). */
function vignette(c: Ctx2D, w: number, h: number, depth: number, strength: number): void {
  const dark = `rgba(0,0,0,${strength})`
  const clear = 'rgba(0,0,0,0)'
  gradientRect(c, 0, 0, w, depth, 0, 0, 0, depth, [[0, dark], [1, clear]])
  gradientRect(c, 0, h - depth, w, depth, 0, h, 0, h - depth, [[0, dark], [1, clear]])
  gradientRect(c, 0, 0, depth, h, 0, 0, depth, 0, [[0, dark], [1, clear]])
  gradientRect(c, w - depth, 0, depth, h, w, 0, w - depth, 0, [[0, dark], [1, clear]])
}

/** Scatters `count` square specks fully inside the area. */
function speckle(
  c: Ctx2D,
  rnd: () => number,
  x0: number,
  y0: number,
  w: number,
  h: number,
  count: number,
  colors: readonly string[],
  size: number,
  alpha: number,
): void {
  for (let i = 0; i < count; i++) {
    const x = x0 + Math.floor(rnd() * (w - size))
    const y = y0 + Math.floor(rnd() * (h - size))
    const col = colors[Math.floor(rnd() * colors.length)]
    rect(c, x, y, size, size, col, alpha)
  }
}

// ---------------------------------------------------------------------------------------------
// Arcade screen, marquee and sign
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Task 20.2: per-game attract screens (256x256) and marquees (256x64). Original art, no real brands.
// ---------------------------------------------------------------------------------------------

/** Task 26.1: crisp 1 px corner brackets in an accent colour, drawn on the attract screens under the scanlines (side-art accents that live in the texture). */
function cornerBrackets(c: Ctx2D, w: number, h: number, inset: number, len: number, color: string): void {
  for (const [x, y, sx, sy] of [[inset, inset, 1, 1], [w - inset - 1, inset, -1, 1], [inset, h - inset - 1, 1, -1], [w - inset - 1, h - inset - 1, -1, -1]] as const) {
    rect(c, sx > 0 ? x : x - len + 1, y, len, 1, color, 0.85)
    rect(c, x, sy > 0 ? y : y - len + 1, 1, len, color, 0.85)
  }
}

/** Phosphor-green CRT Snake: a serpent built from VHS-tape segments on a dark grid, with a faint shadow serpent. */
export function drawAttractSnake(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  vertical(c, w, h, [[0, '#020a05'], [1, '#04140a']])
  // Dark play grid.
  for (let k = 16; k < w; k += 16) {
    rect(c, k, 0, 1, h, '#0e4a2a', 0.35)
    rect(c, 0, k, w, 1, '#0e4a2a', 0.35)
  }
  const route = (i: number) => ({ x: 22 + i * 17, y: 150 + Math.sin(i * 0.8) * 24 })
  // Shadow serpent: larger, offset, very faint, behind the real one.
  for (let i = 0; i < 12; i++) {
    const p = route(i)
    rect(c, p.x - 6, p.y - 26 + (i % 2) * 3, 22, 16, '#0f6a3a', 0.18)
  }
  // The serpent: tape segments (cassette body, label strip, two reel dots) and a head.
  for (let i = 0; i < 11; i++) {
    const p = route(i)
    const y = p.y + Math.floor(rnd() * 2)
    rect(c, p.x, y, 16, 11, '#1f9c52')
    frame(c, p.x, y, 16, 11, '#7dffb0', 1)
    rect(c, p.x + 3, y + 1, 10, 3, '#b8ffd2', 0.8)
    disc(c, p.x + 4.5, y + 7, 2, '#02140a')
    disc(c, p.x + 11.5, y + 7, 2, '#02140a')
  }
  const head = route(11)
  rect(c, head.x, head.y - 2, 18, 15, '#c8ffe0')
  rect(c, head.x + 11, head.y + 1, 3, 3, '#ff3a4a')
  rect(c, head.x + 11, head.y + 7, 3, 3, '#ff3a4a')
  // Prey: a lone tape label.
  rect(c, 58, 205, 9, 9, '#ff5a6a')
  text(c, 'SNAKE.EXE', w / 2 + 2, 37, 'bold 28px monospace', '#0a5a30')
  text(c, 'SNAKE.EXE', w / 2, 35, 'bold 28px monospace', '#7dffc0')
  text(c, 'PRESS E', w / 2, 72, 'bold 16px monospace', '#c8ffe4')
  text(c, 'INSERT 25¢', w / 2, 236, 'bold 12px monospace', '#3fbf8a', 0.9)
  // Phosphor dot grid.
  for (let y = 3; y < h; y += 8) for (let x = 3; x < w; x += 8) rect(c, x, y, 1, 1, '#2fa874', 0.2)
  speckle(c, rnd, 0, 0, w, h, 50, ['#2fa874', '#7dffc0', '#0a3a28'], 2, 0.25)
  cornerBrackets(c, w, h, 6, 14, '#7dffc0')
  scanlines(c, w, h, 2, 0.3)
  vignette(c, w, h, 40, 0.68)
}

/** Vanishing point of the maze corridor and the corridor depth steps (0 = near edge, 1 = vanishing rectangle). */
const MAZE_OUTER = { l: 6, r: 250, t: 6, b: 250 } as const
const MAZE_INNER = { l: 104, r: 152, t: 88, b: 150 } as const
const MAZE_DEPTHS = [0, 0.3, 0.5, 0.65, 0.76, 0.84, 0.9] as const
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Dark labyrinth in one-point perspective, three glowing photo fragments and a lurking silhouette at the far end. */
export function drawAttractMaze(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  rect(c, 0, 0, w, h, '#06020c')
  const level = (k: number) => {
    const f = MAZE_DEPTHS[k]
    return {
      l: lerp(MAZE_OUTER.l, MAZE_INNER.l, f),
      r: lerp(MAZE_OUTER.r, MAZE_INNER.r, f),
      t: lerp(MAZE_OUTER.t, MAZE_INNER.t, f),
      b: lerp(MAZE_OUTER.b, MAZE_INNER.b, f),
    }
  }
  for (let k = 0; k < MAZE_DEPTHS.length - 1; k++) {
    const a = level(k)
    const b = level(k + 1)
    const shade = k % 2 === 0
    triangle(c, [[a.l, a.t], [b.l, b.t], [b.l, b.b], [a.l, a.b]], shade ? '#2c0a1e' : '#1c0716') // left wall
    triangle(c, [[a.r, a.t], [b.r, b.t], [b.r, b.b], [a.r, a.b]], shade ? '#2c0a1e' : '#1c0716') // right wall
    triangle(c, [[a.l, a.t], [a.r, a.t], [b.r, b.t], [b.l, b.t]], '#0c0414') // ceiling
    triangle(c, [[a.l, a.b], [a.r, a.b], [b.r, b.b], [b.l, b.b]], shade ? '#1a0616' : '#12041a') // floor
  }
  // Depth frames and converging edges.
  for (let k = 0; k < MAZE_DEPTHS.length; k++) {
    const a = level(k)
    frame(c, a.l, a.t, a.r - a.l, a.b - a.t, k % 2 === 0 ? '#c8203c' : '#8a3ad0', 1.5, 0.7)
  }
  const far = level(MAZE_DEPTHS.length - 1)
  for (const [x, y] of [[far.l, far.t], [far.r, far.t], [far.l, far.b], [far.r, far.b]] as const) {
    const ox = x < w / 2 ? MAZE_OUTER.l : MAZE_OUTER.r
    const oy = y < h / 2 ? MAZE_OUTER.t : MAZE_OUTER.b
    line(c, ox, oy, x, y, '#8a3ad0', 1.5, 0.8)
  }
  // Far end: a dark doorway with a lurking silhouette and a faint rim light.
  rect(c, far.l, far.t, far.r - far.l, far.b - far.t, '#020106')
  triangle(c, [[120, 114], [136, 114], [141, 156], [115, 156]], '#000000')
  disc(c, 128, 107, 6, '#000000')
  ring(c, 128, 107, 6, '#8a3ad0', 1, 0.55)
  line(c, 120, 114, 115, 156, '#c8203c', 1, 0.45)
  line(c, 136, 114, 141, 156, '#c8203c', 1, 0.45)
  // Three glowing photo fragments: light frame, dark inner photo area.
  for (const [x, y, fw, fh] of [[16, 70, 30, 24], [196, 120, 28, 34], [62, 176, 26, 22]] as const) {
    rect(c, x - 3, y - 3, fw + 6, fh + 6, '#ff9ac0', 0.16)
    rect(c, x, y, fw, fh, '#f0d8e8')
    rect(c, x + 3, y + 3, fw - 6, fh - 6, '#1c0616')
    rect(c, x + fw / 2 - 2, y + 6, 4, 5, '#7a2a5a', 0.8)
  }
  text(c, 'LAST EXIT', w / 2 + 2, 26, 'bold 26px monospace', '#5a0f8a')
  text(c, 'LAST EXIT', w / 2, 24, 'bold 26px monospace', '#ff4a6a')
  speckle(c, rnd, 0, 0, w, h, 50, ['#c8203c', '#8a3ad0', '#000000'], 2, 0.22)
  cornerBrackets(c, w, h, 6, 14, '#ff4a6a')
  scanlines(c, w, h, 2, 0.32)
  vignette(c, w, h, 44, 0.68)
}

/** Dial scale of the frequency screen, in MHz, and the station it is tuned to. */
export const FREQUENCY_TEXT = '89.4 MHz'
const DIAL_MIN_MHZ = 88
const DIAL_MAX_MHZ = 108
const DIAL_STATION_MHZ = 89.4

/** Retro radio oscilloscope: grid, a bright waveform that breaks into noise, a tuning dial with a needle. */
export function drawAttractFrequency(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  vertical(c, w, h, [[0, '#031210'], [1, '#02100e']])
  // Oscilloscope panel with a 8 x 6 graticule.
  const sx = 16
  const sy = 44
  const sw = w - 32
  const sh = 120
  rect(c, sx, sy, sw, sh, '#01201c')
  for (let i = 1; i < 8; i++) line(c, sx + (i * sw) / 8, sy, sx + (i * sw) / 8, sy + sh, '#1fa8a0', 1, 0.28)
  for (let j = 1; j < 6; j++) line(c, sx, sy + (j * sh) / 6, sx + sw, sy + (j * sh) / 6, '#1fa8a0', 1, 0.28)
  line(c, sx, sy + sh / 2, sx + sw, sy + sh / 2, '#2ad8d0', 1, 0.5)
  frame(c, sx, sy, sw, sh, '#2ad8d0', 2)
  // Waveform: a clean sine on the left that tears into noise on the right. Drawn twice for a soft glow.
  const mid = sy + sh / 2
  const pts: Array<[number, number]> = []
  for (let x = sx + 4; x <= sx + sw - 4; x += 4) {
    const u = (x - sx) / sw
    const clean = Math.sin(u * 22) * 34
    const noise = (rnd() - 0.5) * 2 * 40
    const mix = u < 0.5 ? 0 : Math.min(1, (u - 0.5) / 0.25)
    pts.push([x, mid - (clean * (1 - mix) + noise * mix)])
  }
  for (const [lw, alpha, col] of [[5, 0.25, '#ff9a1a'], [2, 1, '#ffc23a']] as const) {
    c.globalAlpha = alpha
    c.strokeStyle = col
    c.lineWidth = lw
    c.beginPath()
    c.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1])
    c.stroke()
    c.globalAlpha = 1
  }
  // Tuning dial: ticks every MHz (long every 5) and a needle on the station.
  const dx0 = 28
  const dx1 = w - 28
  const dialX = (mhz: number) => dx0 + ((mhz - DIAL_MIN_MHZ) / (DIAL_MAX_MHZ - DIAL_MIN_MHZ)) * (dx1 - dx0)
  rect(c, dx0 - 8, 176, dx1 - dx0 + 16, 36, '#0a2a26', 0.9)
  frame(c, dx0 - 8, 176, dx1 - dx0 + 16, 36, '#1fa8a0', 1)
  for (let m = DIAL_MIN_MHZ; m <= DIAL_MAX_MHZ; m++) {
    const x = dialX(m)
    line(c, x, 196, x, (m - DIAL_MIN_MHZ) % 5 === 0 ? 182 : 189, '#ffc23a', 1, 0.85)
  }
  const nx = dialX(DIAL_STATION_MHZ)
  line(c, nx, 178, nx, 210, '#ff3a3a', 2)
  disc(c, nx, 210, 2, '#ff3a3a')
  text(c, FREQUENCY_TEXT, w / 2, 228, 'bold 18px monospace', '#ffc23a')
  text(c, 'DEAD FREQUENCY', w / 2 + 2, 22, 'bold 20px monospace', '#0a5a58')
  text(c, 'DEAD FREQUENCY', w / 2, 20, 'bold 20px monospace', '#2ad8d0')
  speckle(c, rnd, 0, 0, w, h, 50, ['#2ad8d0', '#ffc23a', '#000000'], 2, 0.2)
  cornerBrackets(c, w, h, 6, 14, '#ffc23a')
  scanlines(c, w, h, 2, 0.32)
  vignette(c, w, h, 40, 0.68)
}

export interface MarqueePalette {
  /** Outer trim gradient: edge colour and centre colour. */
  trimEdge: string
  trimCentre: string
  /** Backlit panel gradient: top and bottom. */
  panelTop: string
  panelBottom: string
  bulb: string
  glow: string
  text: string
  textShadow: string
}

export const MARQUEE_TEXTS = Object.freeze({
  snake: 'SNAKE.EXE // THE HUNGRY TAPE',
  maze: 'LAST EXIT // THE MAZE',
  frequency: 'DEAD FREQUENCY // THE LOST SIGNAL',
})

/** Marquee lettering is measured with a fixed per-character width: monospace glyphs are about 0.6 em wide. */
export const MARQUEE_CHAR_WIDTH_EM = 0.6
/** Free space kept at both ends of the lettering. */
export const MARQUEE_TEXT_MARGIN = 14
const MARQUEE_MAX_FONT_PX = 20
const MARQUEE_MIN_FONT_PX = 8

/** Estimated lettering width in px at a font size. */
export const marqueeTextWidth = (s: string, fontPx: number): number => Math.ceil(s.length * fontPx * MARQUEE_CHAR_WIDTH_EM)

/** Largest whole font size whose estimated width fits in `canvasWidth` minus both margins. */
export function marqueeFontSize(s: string, canvasWidth: number): number {
  const fit = Math.floor((canvasWidth - 2 * MARQUEE_TEXT_MARGIN) / (s.length * MARQUEE_CHAR_WIDTH_EM))
  return Math.max(MARQUEE_MIN_FONT_PX, Math.min(MARQUEE_MAX_FONT_PX, fit))
}

function drawMarqueeWith(c: Ctx2D, w: number, h: number, seed: number, label: string, p: MarqueePalette): void {
  const rnd = makeRng(seed)
  gradientRect(c, 0, 0, w, h, 0, 0, w, 0, [[0, p.trimEdge], [0.5, p.trimCentre], [1, p.trimEdge]])
  gradientRect(c, 6, 8, w - 12, h - 16, 0, 8, 0, h - 8, [[0, p.panelTop], [1, p.panelBottom]])
  frame(c, 6, 8, w - 12, h - 16, p.text, 1)
  // Task 26.1: a crisp light top lip and a dark lower edge on the backlit panel, plus two end caps.
  rect(c, 7, 9, w - 14, 1, '#ffffff', 0.3)
  rect(c, 7, h - 10, w - 14, 1, '#000000', 0.4)
  for (const x of [9, w - 10]) rect(c, x, 12, 1, h - 24, p.glow, 0.55)
  // Border bulbs with a soft halo, top and bottom rows.
  for (let x = 12; x <= w - 12; x += 16) {
    for (const y of [4, h - 4]) {
      disc(c, x, y, 3.5, p.glow, 0.35)
      disc(c, x, y, 2, p.bulb)
    }
  }
  const px = marqueeFontSize(label, w)
  const font = `bold ${px}px monospace`
  text(c, label, w / 2 + 1, h / 2 + 2, font, p.textShadow)
  text(c, label, w / 2, h / 2 + 1, font, p.text)
  speckle(c, rnd, 8, 10, w - 16, h - 20, 20, ['#ffffff', '#000000'], 1, 0.08)
}

export const MARQUEE_PALETTES: Readonly<Record<'snake' | 'maze' | 'frequency', MarqueePalette>> = Object.freeze({
  snake: { trimEdge: '#0a4a22', trimCentre: '#2fd06a', panelTop: '#041a0c', panelBottom: '#0a3a1c', bulb: '#eaffe0', glow: '#4fe08a', text: '#9dffc4', textShadow: '#04200e' },
  maze: { trimEdge: '#4a0a2a', trimCentre: '#a02ad0', panelTop: '#1a0414', panelBottom: '#34082a', bulb: '#ffd0e0', glow: '#ff3a6a', text: '#ff7a98', textShadow: '#200418' },
  frequency: { trimEdge: '#5a3a00', trimCentre: '#ffb000', panelTop: '#021a1c', panelBottom: '#06383a', bulb: '#fff2c0', glow: '#2ad8d0', text: '#ffc23a', textShadow: '#021412' },
})

export const drawMarqueeSnake = (c: Ctx2D, w: number, h: number, seed: number): void =>
  drawMarqueeWith(c, w, h, seed, MARQUEE_TEXTS.snake, MARQUEE_PALETTES.snake)
export const drawMarqueeMaze = (c: Ctx2D, w: number, h: number, seed: number): void =>
  drawMarqueeWith(c, w, h, seed, MARQUEE_TEXTS.maze, MARQUEE_PALETTES.maze)
export const drawMarqueeFrequency = (c: Ctx2D, w: number, h: number, seed: number): void =>
  drawMarqueeWith(c, w, h, seed, MARQUEE_TEXTS.frequency, MARQUEE_PALETTES.frequency)

/** Overhead ARCADE sign face: glowing letters (offset copies fake the bloom) between bulb rows. */
export function drawSignFace(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  vertical(c, w, h, [[0, '#1a0a24'], [1, '#2a0e2e']])
  frame(c, 5, 5, w - 10, h - 10, '#ffb347', 5)
  for (let x = 24; x <= w - 24; x += 36) {
    for (const y of [20, h - 20]) {
      disc(c, x, y, 7, '#ffb347', 0.25)
      disc(c, x, y, 4, '#fff2c0')
    }
  }
  for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3]] as const) {
    text(c, 'ARCADE', w / 2 + dx, h / 2 + dy, 'bold 92px monospace', '#ff7a00', 0.2)
  }
  text(c, 'ARCADE', w / 2, h / 2, 'bold 92px monospace', '#ffd27a')
  text(c, 'ARCADE', w / 2 - 1, h / 2 - 2, 'bold 92px monospace', '#fff0c8', 0.35)
  speckle(c, rnd, 8, 8, w - 16, h - 16, 30, ['#000000'], 1, 0.15)
}

// ---------------------------------------------------------------------------------------------
// Posters and plaque (original art, 1990s video-rental look)
// ---------------------------------------------------------------------------------------------

export function drawPosterSunset(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  const horizon = 330
  vertical(c, w, h, [[0, '#12062e'], [0.35, '#5a1470'], [0.6, '#ff3f7f'], [0.65, '#ffb347']])
  speckle(c, rnd, 8, 8, w - 16, 200, 40, ['#ffffff', '#ffe3f2'], 2, 0.9)
  disc(c, w / 2, 270, 80, '#ffd36b')
  for (let i = 0; i < 6; i++) rect(c, 40, 250 + i * 14, w - 80, 3 + i, '#ff3f7f')
  rect(c, 0, horizon, w, h - horizon, '#14052a')
  // Perspective grid.
  for (let k = 1; k <= 8; k++) line(c, 0, horizon + k * k * 2.8, w, horizon + k * k * 2.8, '#ff4fd8', 1.5, 0.8)
  for (let i = -3; i <= 3; i++) line(c, w / 2 + i * 6, horizon, w / 2 + i * 40, h - 4, '#ff4fd8', 1.5, 0.8)
  text(c, 'MIDNIGHT', w / 2, 70, 'bold 34px monospace', '#ffe3f2')
  text(c, 'RENTALS', w / 2, 110, 'bold 34px monospace', '#ffd36b')
  text(c, 'OPEN ALL NIGHT', w / 2, 490, 'bold 18px monospace', '#ffd36b')
  frame(c, 6, 6, w - 12, h - 12, '#ffe3f2', 4)
  speckle(c, rnd, 0, 0, w, h, 80, ['#ffffff', '#000000'], 1, 0.12)
}

export function drawPosterReel(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  vertical(c, w, h, [[0, '#06222a'], [1, '#0c3a44']])
  text(c, 'ARCHIVE', w / 2, 90, 'bold 44px monospace', '#ffd36b')
  rect(c, 40, 126, w - 80, 3, '#ffd36b')
  for (const cx of [82, 174]) {
    disc(c, cx, 260, 56, '#101a1f')
    ring(c, cx, 260, 56, '#ffd36b', 4)
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3
      line(c, cx, 260, cx + Math.cos(a) * 44, 260 + Math.sin(a) * 44, '#6fb6c0', 3)
    }
    disc(c, cx, 260, 16, '#ffd36b')
    disc(c, cx, 260, 5, '#101a1f')
  }
  line(c, 82, 204, 174, 204, '#101a1f', 4)
  line(c, 82, 316, 174, 316, '#101a1f', 4)
  text(c, 'ARCHIVE 09 · EST. 1996', w / 2, 400, 'bold 15px monospace', '#bfe9ee')
  text(c, 'MEMBERS ONLY', w / 2, 450, 'bold 22px monospace', '#ffd36b')
  frame(c, 6, 6, w - 12, h - 12, '#bfe9ee', 3)
  frame(c, 14, 14, w - 28, h - 28, '#bfe9ee', 1)
  speckle(c, rnd, 0, 0, w, h, 80, ['#ffffff', '#000000'], 1, 0.12)
}

/** Memory_Shift poster. Torn paper on a transparent canvas so the opacity fade has an irregular edge. */
export function drawShiftPoster(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  c.clearRect(0, 0, w, h)
  // Torn outline, always inside a 10 px transparent margin.
  c.globalAlpha = 0.98
  c.fillStyle = '#3a0b16'
  c.beginPath()
  c.moveTo(14, 12)
  for (let x = 30; x < w - 14; x += 16) c.lineTo(x, 10 + rnd() * 8)
  c.lineTo(w - 12, 14)
  for (let y = 30; y < h - 14; y += 16) c.lineTo(w - 18 + rnd() * 8, y)
  c.lineTo(w - 14, h - 12)
  for (let x = w - 30; x > 14; x -= 16) c.lineTo(x, h - 18 + rnd() * 8)
  c.lineTo(12, h - 14)
  for (let y = h - 30; y > 14; y -= 16) c.lineTo(10 + rnd() * 8, y)
  c.closePath()
  c.fill()
  c.globalAlpha = 1
  frame(c, 30, 30, w - 60, h - 60, '#c45a70', 3)
  // Rewind arrows.
  triangle(c, [[w / 2 - 6, 150], [w / 2 - 6, 230], [w / 2 - 66, 190]], '#ff7f9a')
  triangle(c, [[w / 2 + 60, 150], [w / 2 + 60, 230], [w / 2 + 0, 190]], '#ff7f9a')
  text(c, 'PLEASE REWIND', w / 2, 300, 'bold 21px monospace', '#ffd0da')
  text(c, 'THE TAPE', w / 2, 350, 'bold 26px monospace', '#ff7f9a')
  text(c, 'REMEMBERS YOU', w / 2, 384, 'bold 20px monospace', '#ff7f9a')
  speckle(c, rnd, 24, 24, w - 48, h - 48, 60, ['#000000', '#7a1228'], 2, 0.3)
}

/** Memory_Shift plaque. Transparent margin around an opaque plate. */
export function drawShiftPlaque(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  c.clearRect(0, 0, w, h)
  rect(c, 8, 8, w - 16, h - 16, '#20080f', 0.98)
  frame(c, 14, 14, w - 28, h - 28, '#ff7f9a', 3)
  text(c, 'MEMBERS REMAIN', w / 2, 58, 'bold 20px monospace', '#ff9fb4')
  rect(c, 60, 78, w - 120, 2, '#ff7f9a', 0.7)
  text(c, 'SINCE 1996', w / 2, 98, 'bold 14px monospace', '#ff7f9a')
  for (const [x, y] of [[22, 22], [w - 22, 22], [22, h - 22], [w - 22, h - 22]] as const) disc(c, x, y, 3, '#8a4a58')
  speckle(c, rnd, 12, 12, w - 24, h - 24, 24, ['#000000', '#ff7f9a'], 1, 0.15)
}

// ---------------------------------------------------------------------------------------------
// Tiling surfaces: floor, wood, grille, control deck
// ---------------------------------------------------------------------------------------------

/** Archive carpet tiles: a 4 x 4 checker of 32 px tiles, grout lines, specks and scuffs. Tiles seamlessly. */
export function drawFloor(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  const n = 4
  const tw = w / n
  const th = h / n
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) rect(c, i * tw, j * th, tw, th, (i + j) % 2 === 0 ? '#352f3c' : '#403850')
  }
  for (let k = 0; k < n; k++) {
    rect(c, k * tw, 0, 1, h, '#0e0b13', 1)
    rect(c, 0, k * th, w, 1, '#0e0b13', 1)
    // Task 26.1: crisper grout. A light lip right after each dark line (tiles stay seamless: the lip of the last line wraps to x = 0 via the next tile).
    rect(c, k * tw + 1, 0, 1, h, '#8a809a', 0.22)
    rect(c, 0, k * th + 1, w, 1, '#8a809a', 0.22)
  }
  // Satin sheen: every tile brightens toward one corner and darkens toward the other, so the repeat stays seamless.
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      gradientRect(c, i * tw + 2, j * th + 2, tw - 2, th - 2, i * tw, j * th, (i + 1) * tw, (j + 1) * th, [[0, 'rgba(255,255,255,0.10)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.12)']])
    }
  }
  speckle(c, rnd, 0, 0, w, h, 140, ['#5a5068', '#1c1824', '#6a5a78'], 1, 0.22)
  // Wear: short lighter scuffs, kept inside the tile.
  for (let i = 0; i < 6; i++) {
    const x = 6 + rnd() * (w - 30)
    const y = 6 + rnd() * (h - 12)
    line(c, x, y, x + 8 + rnd() * 10, y + 1, '#6a6078', 1, 0.18)
  }
}

export interface WoodPalette {
  base: string
  grain: string
  knot: string
}

const WOOD_LIGHT: WoodPalette = { base: '#7a5638', grain: '#4a3020', knot: '#3a2416' }
const WOOD_DARK: WoodPalette = { base: '#4e3522', grain: '#2c1c10', knot: '#1e120a' }

/** Horizontal grain lines (start and end on the same y so it tiles) with two knots and two plank seams. */
export function drawWood(c: Ctx2D, w: number, h: number, seed: number, palette: WoodPalette = WOOD_LIGHT): void {
  const rnd = makeRng(seed)
  rect(c, 0, 0, w, h, palette.base)
  for (let y = 2; y < h; y += 4) {
    const jitter = (rnd() - 0.5) * 3
    c.globalAlpha = 0.25 + rnd() * 0.3
    c.strokeStyle = palette.grain
    c.lineWidth = 1
    c.beginPath()
    c.moveTo(0, y)
    c.lineTo(w / 2, y + jitter)
    c.lineTo(w, y)
    c.stroke()
    c.globalAlpha = 1
  }
  // Task 26.1: deeper grain contrast. Extra dark pores and a few strong grain lines (start and end on the same y, so the tile repeats).
  for (let i = 0; i < 16; i++) {
    const y = 1 + Math.floor(rnd() * (h - 2))
    const len = 12 + Math.floor(rnd() * 40)
    rect(c, Math.floor(rnd() * (w - len)), y, len, 1, palette.knot, 0.28 + rnd() * 0.2)
  }
  for (let y = 5; y < h; y += 16) {
    c.globalAlpha = 0.5
    c.strokeStyle = palette.knot
    c.lineWidth = 1
    c.beginPath()
    c.moveTo(0, y)
    c.lineTo(w / 2, y + (rnd() - 0.5) * 2)
    c.lineTo(w, y)
    c.stroke()
    c.globalAlpha = 1
  }
  // Warm satin varnish: soft full-width highlight streaks (a light, balanced counterweight to the darker grain).
  for (const y of [h * 0.18, h * 0.57, h * 0.83]) {
    rect(c, 0, y, w, 3, '#ffd9a0', 0.1)
    rect(c, 0, y + 1, w, 1, '#fff0d0', 0.12)
  }
  for (const y of [0, h / 2]) rect(c, 0, y, w, 2, palette.knot, 0.7)
  // Edge wear: pale nicks along both plank seams.
  for (const y of [2, h / 2 + 2]) {
    for (let i = 0; i < 5; i++) rect(c, 4 + Math.floor(rnd() * (w - 16)), y, 3 + Math.floor(rnd() * 8), 1, '#e8c898', 0.3)
  }
  for (let k = 0; k < 2; k++) {
    const x = 24 + rnd() * (w - 48)
    const y = 20 + rnd() * (h - 40)
    disc(c, x, y, 6, palette.knot, 0.55)
    ring(c, x, y, 9, palette.grain, 1, 0.6)
    ring(c, x, y, 12, palette.grain, 1, 0.35)
  }
  // Task 27.1: deeper grain. Pale grain highlights (short 1 px strokes inside the tile) beside darker grain cuts, balanced so the mean tone holds.
  for (let i = 0; i < 22; i++) {
    const y = 1 + Math.floor(rnd() * (h - 2))
    const len = 10 + Math.floor(rnd() * 36)
    const x = Math.floor(rnd() * (w - len))
    rect(c, x, y, len, 1, '#ffe2b0', 0.16 + rnd() * 0.1)
    rect(c, x + 2, y + 1 < h ? y + 1 : y, Math.max(1, len - 4), 1, palette.knot, 0.22)
  }
}

/** Louvered speaker grille: horizontal slats with highlight and shadow lines. */
export function drawGrille(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  rect(c, 0, 0, w, h, '#15161b')
  for (let y = 4; y + 5 <= h; y += 8) {
    rect(c, 0, y, w, 4, '#2c2e36')
    rect(c, 0, y, w, 1, '#40424c', 0.7)
    rect(c, 0, y + 4, w, 1, '#06060a')
  }
  frame(c, 2, 2, w - 4, h - 4, '#0a0a0e', 3)
  speckle(c, rnd, 4, 4, w - 8, h - 8, 30, ['#000000', '#50525c'], 1, 0.25)
}


// ---------------------------------------------------------------------------------------------
// Spine atlas (task 18.2): book and VHS slipcase spines for the bookcases
// ---------------------------------------------------------------------------------------------

export const SPINE_ATLAS_WIDTH = 512
export const SPINE_ATLAS_HEIGHT = 256
/** The atlas is one row of eight tall cells, each 64 x 256 px (about the 1:4 aspect of a spine). */
export const SPINE_CELL_WIDTH = 64
/** Spine variants: 0..2 are books, 3..5 are VHS slipcases. Each variant has its own unit-box geometry. */
export const SPINE_VARIANT_COUNT = 6
export const SPINE_BOOK_VARIANTS = [0, 1, 2] as const
export const SPINE_CASE_VARIANTS = [3, 4, 5] as const
/** Cell 6 covers every non-spine face of a book, cell 7 every non-spine face of a slipcase. */
export const SPINE_COVER_CELL = 6
export const SPINE_CASE_SIDE_CELL = 7
/** UV inset in pixels, so mipmapped sampling does not bleed into the neighbouring cell. */
const SPINE_UV_INSET_PX = 3

/** UV rectangle of an atlas cell (canvas top is v = 1). */
export function spineCellUv(cell: number): { u0: number; u1: number; v0: number; v1: number } {
  const x0 = cell * SPINE_CELL_WIDTH + SPINE_UV_INSET_PX
  const x1 = (cell + 1) * SPINE_CELL_WIDTH - SPINE_UV_INSET_PX
  return {
    u0: x0 / SPINE_ATLAS_WIDTH,
    u1: x1 / SPINE_ATLAS_WIDTH,
    v0: SPINE_UV_INSET_PX / SPINE_ATLAS_HEIGHT,
    v1: 1 - SPINE_UV_INSET_PX / SPINE_ATLAS_HEIGHT,
  }
}

/** One letter per line, reading downward, like a title printed along a spine. */
function stackedWord(c: Ctx2D, word: string, cx: number, y0: number, step: number, font: string, color: string): void {
  // Task 26.1: a light embossed copy one pixel down-right under the ink, so the printed spine title reads crisply.
  ;[...word].forEach((ch, i) => {
    if (ch !== ' ') text(c, ch, cx + 1, y0 + i * step + 1, font, '#ffffff', 0.8)
  })
  // Task 27.1: crisper print. The ink is drawn at full strength twice, half a pixel apart, which thickens each stroke to a solid 1 px edge.
  ;[0, 0.5].forEach((dx) => {
    ;[...word].forEach((ch, i) => {
      if (ch !== ' ') text(c, ch, cx + dx, y0 + i * step, font, color)
    })
  })
}

/** Task 26.1: foil stripes at head and tail and a few wear marks on spine cells 0..5 (light tones only, inside the cell). */
function spineFoilAndWear(c: Ctx2D, rnd: () => number, i: number): void {
  const x0 = i * SPINE_CELL_WIDTH
  const W = SPINE_CELL_WIDTH
  rect(c, x0 + 2, 6, W - 4, 2, '#fff2c4', 0.75)
  rect(c, x0 + 2, 9, W - 4, 1, '#ffffff', 0.45)
  rect(c, x0 + 2, SPINE_ATLAS_HEIGHT - 9, W - 4, 2, '#fff2c4', 0.75)
  for (let k = 0; k < 5; k++) {
    const x = x0 + 4 + rnd() * (W - 16)
    const y = 12 + rnd() * (SPINE_ATLAS_HEIGHT - 28)
    line(c, x, y, x + 3 + rnd() * 7, y + 1 + rnd() * 5, '#d8d8d8', 1, 0.5)
  }
  // Worn spine edges: a pale fold line near each side.
  rect(c, x0 + 3, 12, 1, SPINE_ATLAS_HEIGHT - 24, '#ffffff', 0.22)
  rect(c, x0 + W - 4, 12, 1, SPINE_ATLAS_HEIGHT - 24, '#ffffff', 0.18)
}

/** Tiny unreadable "title" strokes: short horizontal marks of varying length, stacked down the spine. */
function glyphMarks(c: Ctx2D, rnd: () => number, cx: number, y0: number, step: number, count: number, color: string): void {
  for (let i = 0; i < count; i++) {
    const w = 14 + Math.floor(rnd() * 24)
    rect(c, cx - w / 2, y0 + i * step, w, 3, color, 0.95)
  }
}

/**
 * Draws atlas cell `i`. The art is light and greyscale-ish on purpose: the per-instance colour multiplies
 * the map, so a light base keeps the instance colour visible while bands, labels and strokes read as
 * darker or lighter tones of it. Only generic words (ARCHIVE, VOL. 3, REWIND) are used.
 */
function drawSpineCell(c: Ctx2D, rnd: () => number, i: number): void {
  const x0 = i * SPINE_CELL_WIDTH
  const cx = x0 + SPINE_CELL_WIDTH / 2
  const W = SPINE_CELL_WIDTH
  const H = SPINE_ATLAS_HEIGHT
  switch (i) {
    case 0: {
      // Paperback: dark head and tail bands, stroke title, publisher dot.
      rect(c, x0, 0, W, H, '#e4e4e4')
      rect(c, x0, 0, W, 34, '#a8a8a8')
      rect(c, x0, 34, W, 3, '#767676')
      glyphMarks(c, rnd, cx, 60, 14, 9, '#4a4a4a')
      rect(c, x0, 211, W, 3, '#767676')
      rect(c, x0, 214, W, 42, '#a8a8a8')
      disc(c, cx, 235, 9, '#f4f4f4')
      ring(c, cx, 235, 9, '#555555', 1.5)
      break
    }
    case 1: {
      // Hardcover: gilded rings at head and tail, a framed label with a stacked title.
      rect(c, x0, 0, W, H, '#d2d2d2')
      for (const y of [14, 230]) {
        rect(c, x0, y, W, 4, '#f6f6f6')
        rect(c, x0, y + (y < 100 ? 10 : 8), W, 2, '#f6f6f6')
      }
      rect(c, x0 + 8, 56, 48, 110, '#f8f8f8')
      frame(c, x0 + 8, 56, 48, 110, '#6a6a6a', 1.5)
      stackedWord(c, 'ARCHIVE', cx, 72, 14, 'bold 12px monospace', '#2e2e2e')
      rect(c, x0 + 14, 182, 36, 3, '#6a6a6a')
      rect(c, x0 + 14, 192, 36, 3, '#6a6a6a')
      break
    }
    case 2: {
      // Two-tone: pale upper, dark lower, volume number.
      rect(c, x0, 0, W, 150, '#eeeeee')
      rect(c, x0, 150, W, H - 150, '#a0a0a0')
      rect(c, x0, 148, W, 4, '#5e5e5e')
      stackedWord(c, 'VOL. 3', cx, 30, 22, 'bold 16px monospace', '#2e2e2e')
      glyphMarks(c, rnd, cx, 172, 14, 4, '#3c3c3c')
      rect(c, x0 + 22, 236, 20, 8, '#f2f2f2')
      break
    }
    case 3: {
      // Slipcase A: dark head, white label strip with a stacked word and rules.
      rect(c, x0, 0, W, H, '#cfcfcf')
      rect(c, x0, 0, W, 14, '#6e6e6e')
      rect(c, x0 + 6, 22, 52, 200, '#fafafa')
      frame(c, x0 + 6, 22, 52, 200, '#8a8a8a', 1)
      stackedWord(c, 'REWIND', cx, 60, 20, 'bold 15px monospace', '#2e2e2e')
      glyphMarks(c, rnd, cx, 176, 10, 4, '#555555')
      rect(c, x0, 232, W, 24, '#6e6e6e')
      break
    }
    case 4: {
      // Slipcase B: wide dark head, label with stroke title, tail stripes.
      rect(c, x0, 0, W, H, '#e0e0e0')
      rect(c, x0, 0, W, 70, '#9a9a9a')
      rect(c, x0, 70, W, 3, '#5a5a5a')
      rect(c, x0 + 6, 84, 52, 120, '#fafafa')
      glyphMarks(c, rnd, cx, 98, 14, 7, '#444444')
      rect(c, x0, 214, W, 6, '#5a5a5a')
      rect(c, x0, 226, W, 3, '#5a5a5a')
      rect(c, x0, 240, W, 16, '#9a9a9a')
      break
    }
    case 5: {
      // Slipcase C: banded, with a stacked ARCHIVE title.
      rect(c, x0, 0, W, H, '#bdbdbd')
      rect(c, x0, 20, W, 26, '#f4f4f4')
      rect(c, x0, 52, W, 8, '#707070')
      rect(c, x0, 212, W, 26, '#f4f4f4')
      stackedWord(c, 'ARCHIVE', cx, 74, 18, 'bold 14px monospace', '#2c2c2c')
      glyphMarks(c, rnd, cx, 196, 6, 2, '#555555')
      break
    }
    case 6: {
      // Book cover cloth: faint horizontal grain and darker edges.
      rect(c, x0, 0, W, H, '#d4d4d4')
      for (let y = 3; y < H; y += 6) rect(c, x0, y, W, 1, '#505050', 0.25)
      rect(c, x0, 0, 3, H, '#9a9a9a')
      rect(c, x0 + W - 3, 0, 3, H, '#9a9a9a')
      speckle(c, rnd, x0 + 4, 4, W - 8, H - 8, 24, ['#bcbcbc', '#e8e8e8'], 2, 0.5)
      break
    }
    default: {
      // Slipcase plastic side: ridges and a small blank sticker.
      rect(c, x0, 0, W, H, '#b4b4b4')
      for (let y = 8; y < H; y += 16) rect(c, x0, y, W, 2, '#8e8e8e')
      rect(c, x0 + 14, 100, 36, 56, '#d8d8d8')
      frame(c, x0 + 14, 100, 36, 56, '#7a7a7a', 1)
    }
  }
}

export function drawSpineAtlas(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  // Cells are laid out for the nominal 512 x 256 canvas; spec width and height are fixed.
  if (w !== SPINE_ATLAS_WIDTH || h !== SPINE_ATLAS_HEIGHT) throw new Error('spine atlas size is fixed')
  for (let i = 0; i < SPINE_ATLAS_WIDTH / SPINE_CELL_WIDTH; i++) drawSpineCell(c, rnd, i)
  for (let i = 0; i < SPINE_VARIANT_COUNT; i++) spineFoilAndWear(c, rnd, i)
}

// ---------------------------------------------------------------------------------------------
// Task 18.3: wall panelling, woven rug, cork bulletin board and lamp glow
// ---------------------------------------------------------------------------------------------

/** One wall texture repeat covers this many metres horizontally and vertically (full wall height). */
export const WALL_METRES_U = 2.5
export const WALL_METRES_V = 3
/** Top of the chair rail above the floor. */
export const WAINSCOT_HEIGHT = 1.05
/** Average albedo of the baked wall texture (0..1 per channel). Memory_Shift uses it to keep the shifted wall colour. */
export const WALL_TEXTURE_ALBEDO = [0.36, 0.34, 0.45] as const

/**
 * Wainscot wall: two raised panels per repeat with rails and stiles, a chair rail at 1.05 m, a darker
 * skirting band, and plaster above with faint stains and wear. The plaster tone is baked in: the wall
 * material colour is a near-white multiplier that Memory_Shift tints. Tiles seamlessly in both directions.
 */
export function drawWallPanel(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  // Pixel sizes below were authored for 512 px; `k` keeps every feature at the same world size at 256 px.
  const k = w / 512
  const lw = (n: number) => Math.max(1, n * k)
  const px = (m: number) => (m * w) / WALL_METRES_U
  const py = (m: number) => h - (m * h) / WALL_METRES_V
  const railY = py(WAINSCOT_HEIGHT)
  // Upper plaster.
  gradientRect(c, 0, 0, w, railY, 0, 0, 0, railY, [[0, '#686184'], [1, '#5e5878']])
  speckle(c, rnd, 0, 0, w, railY, 320, ['#716a8c', '#544e6c', '#5b5575'], lw(2), 0.35)
  // Faint stains, kept away from the tile edges so the texture repeats cleanly.
  for (let i = 0; i < 5; i++) {
    const x = 50 * k + rnd() * (w - 100 * k)
    const y = 30 * k + rnd() * (railY - 120 * k)
    const r = (14 + rnd() * 26) * k
    disc(c, x, y, r, '#2e2842', 0.06)
    disc(c, x, y, r * 0.6, '#2e2842', 0.06)
    rect(c, x, y, lw(3), (40 + rnd() * 60) * k, '#2e2842', 0.06)
  }
  // Picture rail and a few hairline cracks.
  rect(c, 0, py(2.25), w, lw(2), '#4c4664', 0.55)
  rect(c, 0, py(2.25) + lw(2), w, lw(1), '#7a7396', 0.35)
  for (let i = 0; i < 3; i++) {
    const x = 60 * k + rnd() * (w - 140 * k)
    const y = 20 * k + rnd() * (railY - 100 * k)
    line(c, x, y, x + (6 + rnd() * 8) * k, y + (20 + rnd() * 30) * k, '#3c3652', lw(1), 0.3)
  }
  // Wainscot base, panels, rails and stiles.
  rect(c, 0, railY, w, h - railY, '#4e4868')
  const inset = 12 * k
  for (let i = 0; i < 2; i++) {
    const x0 = px(i * 1.25) + px(0.1)
    const pw = px(1.05)
    const top = py(0.93)
    const bottom = py(0.17)
    const ph = bottom - top
    rect(c, x0, top, pw, ph, '#575172')
    line(c, x0, top, x0 + pw, top, '#7a7396', lw(2), 0.9)
    line(c, x0, top, x0, bottom, '#7a7396', lw(2), 0.9)
    line(c, x0, bottom, x0 + pw, bottom, '#26223a', lw(2), 0.9)
    line(c, x0 + pw, top, x0 + pw, bottom, '#26223a', lw(2), 0.9)
    // Inner recessed field.
    rect(c, x0 + inset, top + inset, pw - 2 * inset, ph - 2 * inset, '#4a4463')
    line(c, x0 + inset, top + inset, x0 + pw - inset, top + inset, '#26223a', lw(2), 0.8)
    line(c, x0 + inset, top + inset, x0 + inset, bottom - inset, '#26223a', lw(2), 0.8)
    line(c, x0 + inset, bottom - inset, x0 + pw - inset, bottom - inset, '#7a7396', lw(1.5), 0.6)
    line(c, x0 + pw - inset, top + inset, x0 + pw - inset, bottom - inset, '#7a7396', lw(1.5), 0.6)
    speckle(c, rnd, x0 + 14 * k, top + 14 * k, pw - 28 * k, ph - 28 * k, 40, ['#3a3552', '#625b80'], lw(2), 0.3)
  }
  // Chair rail and skirting band.
  rect(c, 0, railY - inset, w, inset, '#706991')
  rect(c, 0, railY - inset, w, lw(2), '#8c85ab')
  rect(c, 0, railY, w, 3 * k, '#26223a', 0.7)
  const baseY = py(0.14)
  rect(c, 0, baseY, w, h - baseY, '#38334e')
  rect(c, 0, baseY, w, lw(2), '#5a5478', 0.8)
  // Scuffs on the lower panels.
  for (let i = 0; i < 8; i++) {
    const x = 20 * k + rnd() * (w - 70 * k)
    const y = py(0.7) + rnd() * (baseY - py(0.7) - 10 * k)
    line(c, x, y, x + (10 + rnd() * 24) * k, y + (1 + rnd() * 3) * k, '#7f7899', lw(1), 0.22)
  }
  // Task 26.1: plaster shading (a light wash high up, a dark wash just above the picture rail's shadow side) and a wainscot wash
  // that is brighter under the chair rail and darker toward the floor. Light and dark parts are balanced so the mean albedo
  // stays close to WALL_TEXTURE_ALBEDO.
  gradientRect(c, 0, 0, w, railY - inset, 0, 0, 0, railY - inset, [[0, 'rgba(255,255,255,0.05)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.05)']])
  gradientRect(c, 0, railY, w, baseY - railY, 0, railY, 0, baseY, [[0, 'rgba(255,255,255,0.05)'], [1, 'rgba(0,0,0,0.05)']])
  // Baseboard grime band: a darker streaky strip with a light top edge and a few scuff ticks (inside the tile, so it repeats cleanly).
  rect(c, 0, baseY + lw(3), w, Math.max(2, h - baseY - lw(3)), '#14101e', 0.22)
  for (let i = 0; i < 10; i++) rect(c, rnd() * (w - 12 * k), baseY + lw(3) + rnd() * (h - baseY - lw(6)), (4 + rnd() * 10) * k, lw(1), '#0e0b16', 0.3)
  rect(c, 0, baseY + lw(2), w, lw(1), '#8c85ab', 0.2)
}

/** Rug size in metres, the layout footprint of the 'rug' decal (3.0 x 2.2). The texture is stretched over it. */
export const RUG_METRES = [3, 2.2] as const

/**
 * Woven rug: dark outer edge, cream pinstripes, a diamond border, a stepped diamond medallion with corner
 * spandrels, weft lines, thread noise and short fringes on the two short ends. Pattern shapes are laid out
 * in metres so they stay square on the stretched plane.
 */
export function drawRugWoven(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  const X = (m: number) => (m * w) / RUG_METRES[0]
  const Y = (m: number) => (m * h) / RUG_METRES[1]
  const bands: ReadonlyArray<readonly [number, string]> = [
    [0, '#24203a'],
    [0.1, '#d2bc82'],
    [0.13, '#6e2636'],
    [0.4, '#d2bc82'],
    [0.43, '#24203a'],
    [0.5, '#8c3446'],
  ]
  for (const [m, col] of bands) rect(c, X(m), Y(m), w - 2 * X(m), h - 2 * Y(m), col)
  // Task 27.1: crisp woven border threads in the crimson ring (0.13 m to 0.4 m): warp ticks along the long borders and weft ticks
  // along the short ones, on a 2 px pitch, one dark and one light thread per pair.
  const rx0 = X(0.13)
  const rx1 = w - X(0.13)
  const ry0 = Y(0.13)
  const ry1 = h - Y(0.13)
  const ix0 = X(0.4)
  const ix1 = w - X(0.4)
  const iy0 = Y(0.4)
  const iy1 = h - Y(0.4)
  for (let x = Math.ceil(rx0); x + 2 <= rx1; x += 2) {
    for (const [ya, yb] of [[ry0, iy0], [iy1, ry1]] as const) {
      rect(c, x, ya, 1, yb - ya, '#12101c', 0.24)
      rect(c, x + 1, ya, 1, yb - ya, '#f0d8b0', 0.1)
    }
  }
  for (let y = Math.ceil(iy0); y + 2 <= iy1; y += 2) {
    for (const [xa, xb] of [[rx0, ix0], [ix1, rx1]] as const) {
      rect(c, xa, y, xb - xa, 1, '#12101c', 0.24)
      rect(c, xa, y + 1, xb - xa, 1, '#f0d8b0', 0.1)
    }
  }
  const diamond = (cx: number, cy: number, hw: number, hh: number, color: string, alpha = 1) =>
    triangle(c, [[cx - hw, cy], [cx, cy - hh], [cx + hw, cy], [cx, cy + hh]], color, alpha)
  // Border diamonds along the long and short edges.
  for (let m = 0.55; m <= RUG_METRES[0] - 0.55 + 1e-9; m += 0.3) {
    for (const y of [Y(0.265), h - Y(0.265)]) {
      diamond(X(m), y, X(0.09), Y(0.09), '#d2bc82')
      diamond(X(m), y, X(0.04), Y(0.04), '#24203a')
    }
  }
  for (let m = 0.55; m <= RUG_METRES[1] - 0.55 + 1e-9; m += 0.3) {
    for (const x of [X(0.265), w - X(0.265)]) {
      diamond(x, Y(m), X(0.09), Y(0.09), '#d2bc82')
      diamond(x, Y(m), X(0.04), Y(0.04), '#24203a')
    }
  }
  // Field corner spandrels.
  const fx0 = X(0.5)
  const fy0 = Y(0.5)
  const fx1 = w - X(0.5)
  const fy1 = h - Y(0.5)
  for (const [x, y, sx, sy] of [[fx0, fy0, 1, 1], [fx1, fy0, -1, 1], [fx0, fy1, 1, -1], [fx1, fy1, -1, -1]] as const) {
    triangle(c, [[x, y], [x + sx * X(0.5), y], [x, y + sy * Y(0.5)]], '#24203a')
    triangle(c, [[x, y], [x + sx * X(0.3), y], [x, y + sy * Y(0.3)]], '#d2bc82', 0.9)
  }
  // Stepped medallion.
  const cx = w / 2
  const cy = h / 2
  const steps: ReadonlyArray<readonly [number, string]> = [
    [1, '#6e2636'],
    [0.82, '#d2bc82'],
    [0.74, '#24203a'],
    [0.56, '#a03a4a'],
    [0.32, '#d2bc82'],
    [0.2, '#24203a'],
  ]
  for (const [s, col] of steps) {
    diamond(cx, cy, X(0.95 * s), Y(0.58 * s), col)
    // Task 27.1: a thin dark outline on every medallion step raises the pattern contrast.
    const hw = X(0.95 * s)
    const hh = Y(0.58 * s)
    for (const [ax, ay, bx2, by2] of [[cx - hw, cy, cx, cy - hh], [cx, cy - hh, cx + hw, cy], [cx + hw, cy, cx, cy + hh], [cx, cy + hh, cx - hw, cy]] as const) {
      line(c, ax, ay, bx2, by2, '#12101c', 1, 0.5)
    }
  }
  for (const dx of [-0.45, 0.45]) diamond(cx + X(dx), cy, X(0.09), Y(0.09), '#d2bc82')
  // Weft lines, thread noise, a worn patch and the end fringes.
  for (let y = 0; y < h; y += 2) rect(c, 0, y, w, 1, y % 4 === 0 ? '#ffffff' : '#000000', y % 4 === 0 ? 0.06 : 0.12)
  speckle(c, rnd, 0, 0, w, h, 380, ['#ffffff', '#000000', '#d2bc82'], 1, 0.13)
  disc(c, cx + X(0.3), cy + Y(0.2), X(0.18), '#000000', 0.06)
  for (let y = 2; y < h - 2; y += 3) {
    line(c, 0, y, 4, y, '#d8cfae', 1, 0.85)
    line(c, w - 4, y, w, y, '#d8cfae', 1, 0.85)
  }
}

/** Tilted rectangle as a polygon (the 2D context subset has no rotate). Returns the corner points. */
function tilted(c: Ctx2D, cx: number, cy: number, w: number, h: number, angle: number, color: string, alpha = 1) {
  const cs = Math.cos(angle)
  const sn = Math.sin(angle)
  const pts = ([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]] as const).map(
    ([x, y]) => [cx + x * cs - y * sn, cy + x * sn + y * cs] as const,
  )
  triangle(c, pts, color, alpha)
  return pts
}

/**
 * Tiny stroke handwriting: a jittery polyline with occasional pen lifts. Unreadable on purpose.
 * `k` scales the step, the jitter and the line width (1 = the 512 px authoring size).
 */
function scribble(c: Ctx2D, rnd: () => number, x: number, y: number, w: number, color: string, alpha = 0.85, k = 1): void {
  c.globalAlpha = alpha
  c.strokeStyle = color
  c.lineWidth = Math.max(1, k)
  c.beginPath()
  c.moveTo(x, y)
  const step = 3 * k
  for (let xx = x + step; xx < x + w; xx += step) {
    const yy = y + (rnd() - 0.5) * 5 * k
    if (rnd() < 0.12) c.moveTo(xx + step, yy)
    else c.lineTo(xx, yy)
  }
  c.stroke()
  c.globalAlpha = 1
}

function pushPin(c: Ctx2D, x: number, y: number, color: string, k = 1): void {
  disc(c, x + 2 * k, y + 3 * k, 5 * k, '#000000', 0.3)
  disc(c, x, y, 5 * k, color)
  disc(c, x - 1.5 * k, y - 1.5 * k, 1.8 * k, '#ffffff', 0.7)
}

/**
 * Ruled index card with a red header line, an optional title and handwriting lines. Position and size are in
 * canvas px; `k` scales the fixed offsets inside the card (shadow, header, rule spacing, margins).
 */
function indexCard(c: Ctx2D, rnd: () => number, x: number, y: number, w: number, h: number, title: string | null, font: string, ink: string, k = 1): void {
  const hair = Math.max(1, k)
  rect(c, x + 3 * k, y + 4 * k, w, h, '#000000', 0.25)
  rect(c, x, y, w, h, '#efe8cf')
  rect(c, x, y + 18 * k, w, hair, '#c85a5a', 0.8)
  for (let ly = y + 32 * k; ly < y + h - 6 * k; ly += 13 * k) rect(c, x + 4 * k, ly, w - 8 * k, hair, '#8ab0d8', 0.6)
  if (title) text(c, title, x + w / 2, y + 9 * k, font, ink)
  for (let ly = y + 40 * k; ly < y + h - 8 * k; ly += 13 * k) scribble(c, rnd, x + 8 * k, ly, w - 16 * k - rnd() * 30 * k, '#2a2a3a', 0.85, k)
}

/** Polaroid: light frame, dark photo area with a simple window and silhouette, handwritten caption. `k` scales fixed offsets. */
function polaroid(c: Ctx2D, rnd: () => number, cx: number, cy: number, w: number, h: number, angle: number, k = 1): void {
  tilted(c, cx + 3 * k, cy + 4 * k, w, h, angle, '#000000', 0.25)
  const pts = tilted(c, cx, cy, w, h, angle, '#ece8dc')
  // Task 26.1: crisp frame edge, light on the top and left, grey on the bottom and right.
  for (let e = 0; e < 4; e++) {
    const a = pts[e]
    const b = pts[(e + 1) % 4]
    line(c, a[0], a[1], b[0], b[1], e < 2 ? '#fffdf4' : '#9a968a', Math.max(1, k), 0.8)
  }
  const side = w - 16 * k
  const py0 = cy - h / 2 + 8 * k + side / 2
  tilted(c, cx, py0, side, side, angle, '#1d1a24')
  tilted(c, cx - side * 0.2, py0 - side * 0.1, side * 0.3, side * 0.36, angle, '#34344c')
  disc(c, cx + side * 0.18, py0 + side * 0.1, side * 0.13, '#0c0a10')
  rect(c, cx + side * 0.06, py0 + side * 0.2, side * 0.26, side * 0.28, '#0c0a10')
  speckle(c, rnd, cx - side / 2 + 2 * k, py0 - side / 2 + 2 * k, side - 4 * k, side - 4 * k, Math.max(1, Math.round(24 * k * k)), ['#ffffff', '#000000'], 1, 0.18)
  scribble(c, rnd, cx - w / 2 + 12 * k, cy + h / 2 - 12 * k, w - 28 * k, '#3a3a4a', 0.7, k)
}

/** Sticky note: tilted coloured square with a darker lower edge and two lines of handwriting. `k` scales fixed offsets. */
function stickyNote(c: Ctx2D, rnd: () => number, cx: number, cy: number, s: number, angle: number, color: string, edge: string, k = 1): void {
  tilted(c, cx + 2 * k, cy + 3 * k, s, s, angle, '#000000', 0.25)
  tilted(c, cx, cy, s, s, angle, color)
  tilted(c, cx, cy + s / 2 - 3 * k, s, 6 * k, angle, edge, 0.6)
  // Task 26.1: the glued top strip catches the light.
  tilted(c, cx, cy - s / 2 + 2 * k, s, 4 * k, angle, '#ffffff', 0.3)
  scribble(c, rnd, cx - s / 2 + 8 * k, cy - 6 * k, s - 16 * k, '#3a2a2a', 0.8, k)
  scribble(c, rnd, cx - s / 2 + 8 * k, cy + 8 * k, s - 24 * k, '#3a2a2a', 0.8, k)
}

/**
 * Cork bulletin board for a 1.3 m x 0.9 m plane (the canvas is square, so it is stretched about 1.44x
 * vertically; shapes are sized for that). Original content only: index cards, Polaroids, sticky notes,
 * red string between push-pins, and a few generic archive words.
 *
 * Task 22.1: the canvas is 256 x 256. Every coordinate, size, line width and font size was authored for 512 px
 * and is multiplied by `k = w / 512` (same approach as drawWallPanel). Font sizes are clamped to at least 7 px
 * so the card titles stay legible, and all lettering stays inside the canvas.
 */
export function drawCorkBoard(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  const k = w / 512
  const S = (n: number) => n * k
  const lw = (n: number) => Math.max(1, n * k)
  const sz = (n: number) => Math.max(1, Math.round(n * k))
  const cnt = (n: number) => Math.max(1, Math.round(n * k * k))
  const font = (n: number) => `bold ${Math.max(7, Math.round(n * k))}px monospace`
  rect(c, 0, 0, w, h, '#a47a4a')
  speckle(c, rnd, 0, 0, w, h, cnt(700), ['#7e5a34', '#b99060', '#5e4226', '#c8a470'], sz(2), 0.5)
  speckle(c, rnd, 0, 0, w, h, cnt(120), ['#3e2a18', '#d8b888'], sz(3), 0.25)
  // Cards (axis aligned so the lettering is straight).
  indexCard(c, rnd, S(24), S(28), S(132), S(100), 'TAPE 001', font(16), '#1a1a2a', k)
  indexCard(c, rnd, S(292), S(30), S(150), S(100), 'ARCHIVE 09', font(16), '#1a1a2a', k)
  indexCard(c, rnd, S(226), S(184), S(164), S(110), null, font(13), '#8a1a1a', k)
  text(c, 'WHO TAPED OVER?', S(226 + 82), S(184 + 9), font(13), '#8a1a1a')
  rect(c, S(226 + 14), S(184 + 14), S(136), lw(2), '#8a1a1a', 0.7)
  indexCard(c, rnd, S(24), S(318), S(150), S(110), 'DO NOT ERASE', font(11), '#1a1a2a', k)
  // Polaroids and sticky notes.
  polaroid(c, rnd, S(224), S(84), S(96), S(118), -0.05, k)
  polaroid(c, rnd, S(158), S(222), S(96), S(118), 0.06, k)
  polaroid(c, rnd, S(238), S(380), S(96), S(118), 0.04, k)
  polaroid(c, rnd, S(436), S(392), S(96), S(118), -0.06, k)
  stickyNote(c, rnd, S(478), S(66), S(54), 0.08, '#f09ab0', '#c8708a', k)
  stickyNote(c, rnd, S(58), S(204), S(62), -0.07, '#f2e060', '#c8b440', k)
  stickyNote(c, rnd, S(448), S(204), S(62), 0.05, '#9ad88a', '#70b060', k)
  stickyNote(c, rnd, S(346), S(352), S(58), -0.04, '#8ac8e8', '#5a9cc0', k)
  // Red string between push-pins, as straight segments.
  const pins = {
    a: [90, 34], b: [224, 32], c: [367, 36], d: [478, 44], e: [308, 190], f: [158, 170],
    g: [58, 176], h: [448, 176], i: [99, 324], j: [238, 326], k: [346, 324], l: [436, 338],
  } as const
  const links = [
    ['a', 'b'], ['b', 'c'], ['c', 'd'], ['c', 'e'], ['e', 'f'], ['f', 'g'], ['e', 'h'],
    ['f', 'j'], ['j', 'i'], ['j', 'k'], ['k', 'l'], ['g', 'i'], ['h', 'l'],
  ] as const
  for (const [from, to] of links) {
    const p = pins[from]
    const q = pins[to]
    line(c, S(p[0] + 1), S(p[1] + 2), S(q[0] + 1), S(q[1] + 2), '#000000', lw(1.5), 0.25)
    line(c, S(p[0]), S(p[1]), S(q[0]), S(q[1]), '#c42222', lw(1.5), 0.92)
  }
  // Task 26.1: a thin lighter strand on every string link (a different stroke colour, so the red string count is unchanged).
  for (const [from, to] of links) {
    const p = pins[from]
    const q = pins[to]
    line(c, S(p[0]), S(p[1] - 1), S(q[0]), S(q[1] - 1), '#ff7a6a', lw(0.6), 0.45)
  }
  // Task 26.1: a dark 1 px outline and a strip of translucent tape on each index card.
  for (const [x, y, cw, ch] of [[24, 28, 132, 100], [292, 30, 150, 100], [226, 184, 164, 110], [24, 318, 150, 110]] as const) {
    frame(c, S(x), S(y), S(cw), S(ch), '#5a4a30', lw(1), 0.7)
    rect(c, S(x + cw / 2 - 16), S(y - 5), S(32), S(10), '#f0e6a8', 0.55)
  }
  const pinColors = ['#d62a2a', '#2a5ad6', '#e8c42a', '#2aa84a'] as const
  Object.values(pins).forEach((p, i) => pushPin(c, S(p[0]), S(p[1]), pinColors[i % pinColors.length], k))
  vignette(c, w, h, S(24), 0.35)
}

/**
 * Colour stops of the lamp glow radial gradient (task 23.1, richer in 24.1): a bright warm-white core, golden amber,
 * then a long soft falloff that reaches alpha 0 at LAMP_GLOW_RADIUS_FRACTION of the half width, so the disc has no hard edge.
 */
export const LAMP_GLOW_STOPS: Stops = [
  // Task 24.1: bright warm-white core, rich golden amber mid falloff, then a smooth feather to alpha 0 at the end.
  [0, 'rgba(255,252,240,1)'],
  [0.05, 'rgba(255,246,214,0.95)'],
  [0.14, 'rgba(255,224,150,0.7)'],
  [0.3, 'rgba(255,190,80,0.42)'],
  [0.5, 'rgba(244,156,40,0.2)'],
  [0.7, 'rgba(214,120,22,0.075)'],
  [0.86, 'rgba(190,100,18,0.02)'],
  [1, 'rgba(180,90,16,0)'],
]
/** Radius where the glow reaches alpha 0, as a fraction of half the canvas width (the outer ring stays clear). */
export const LAMP_GLOW_RADIUS_FRACTION = 0.9

/**
 * Soft warm radial glow for the additive lamp sprite and desk pool: a multi-stop radial gradient from a bright
 * filament core to transparent amber, plus a tiny solid filament dot. Fully deterministic (no random input).
 */
export function drawLampGlow(c: Ctx2D, w: number, h: number, _seed: number): void {
  c.clearRect(0, 0, w, h)
  const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, (w / 2) * LAMP_GLOW_RADIUS_FRACTION)
  for (const [o, col] of LAMP_GLOW_STOPS) g.addColorStop(o, col)
  c.globalAlpha = 1
  c.fillStyle = g
  c.fillRect(0, 0, w, h)
  // Bright filament core.
  disc(c, w / 2, h / 2, Math.max(1.5, w * 0.018), '#ffffff', 0.95)
}

// ---------------------------------------------------------------------------------------------
// Task 19.2: reference monitor test card, powered-down glass and VCR timecode window
// ---------------------------------------------------------------------------------------------

/** Seven colour bars at 75% levels, left to right: white, yellow, cyan, green, magenta, red, blue. */
export const SMPTE_BAR_COLORS = ['#bfbfbf', '#bfbf00', '#00bfbf', '#00bf00', '#bf00bf', '#bf0000', '#0000bf'] as const
/** Reverse (castellation) strip under the bars: blue, black, magenta, black, cyan, black, white. */
export const SMPTE_REVERSE_COLORS = ['#0000bf', '#131313', '#bf00bf', '#131313', '#00bfbf', '#131313', '#bfbfbf'] as const
/** Approximate luma of each bar at 75% levels (0..0.75), used for the waveform staircase. */
const SMPTE_BAR_LUMA = [0.75, 0.66, 0.52, 0.44, 0.31, 0.23, 0.08] as const

/**
 * SMPTE-style colour bars: the top two thirds are the seven bars, then a reverse strip, then a PLUGE strip
 * (-I, white, +Q, black with three near-black pulses). A small waveform monitor with a staircase trace and
 * seeded jitter sits in the top-right corner. The bars are drawn first and in order, with no random input.
 */
export function drawSmpteBars(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  const barsH = Math.round((h * 2) / 3)
  const revH = Math.round(h / 12)
  const bx = (i: number) => Math.round((i * w) / 7)
  SMPTE_BAR_COLORS.forEach((col, i) => rect(c, bx(i), 0, bx(i + 1) - bx(i), barsH, col))
  SMPTE_REVERSE_COLORS.forEach((col, i) => rect(c, bx(i), barsH, bx(i + 1) - bx(i), revH, col))
  const y0 = barsH + revH
  const ph = h - y0
  const seg = (a: number, b: number, col: string) => rect(c, Math.round(a * w), y0, Math.round(b * w) - Math.round(a * w), ph, col)
  seg(0, 1 / 6, '#00214c')
  seg(1 / 6, 2 / 6, '#ffffff')
  seg(2 / 6, 3 / 6, '#32006a')
  seg(3 / 6, 1, '#101010')
  seg(4 / 6, 4 / 6 + 1 / 18, '#090909')
  seg(5 / 6, 5 / 6 + 1 / 18, '#191919')
  // Waveform monitor: dark panel, graticule and a jittery staircase trace.
  const pw = Math.round(w * 0.3)
  const pH = Math.round(h * 0.2)
  const left = w - pw - 4
  const top = 4
  rect(c, left, top, pw, pH, '#000000', 0.72)
  for (const f of [0.25, 0.5, 0.75]) line(c, left, top + pH * f, left + pw, top + pH * f, '#2a6a3a', 1, 0.7)
  frame(c, left + 0.5, top + 0.5, pw - 1, pH - 1, '#2a6a3a', 1, 0.9)
  c.globalAlpha = 1
  c.strokeStyle = '#7dffb0'
  c.lineWidth = 1
  c.beginPath()
  SMPTE_BAR_LUMA.forEach((luma, i) => {
    const y = top + pH - 2 - (luma / 0.75) * (pH - 5) + (rnd() - 0.5) * 1.2
    const xa = left + 1 + (i * (pw - 2)) / 7
    const xb = left + 1 + ((i + 1) * (pw - 2)) / 7
    if (i === 0) c.moveTo(xa, y)
    else c.lineTo(xa, y)
    c.lineTo(xb, y)
  })
  c.stroke()
}

/** Time shown on the VCR display. */
export const TIMECODE_TEXT = '00:19:96'

/** Green seven-segment style readout: ghost unlit digits, a soft halo from offset copies, bright digits. */
export function drawTimecode(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  const font = 'bold 22px monospace'
  rect(c, 0, 0, w, h, '#031008')
  text(c, '88:88:88', w / 2, h / 2 + 1, font, '#0d3a22', 0.5)
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) text(c, TIMECODE_TEXT, w / 2 + dx, h / 2 + 1 + dy, font, '#1fae5a', 0.35)
  text(c, TIMECODE_TEXT, w / 2, h / 2 + 1, font, '#5dffa0')
  speckle(c, rnd, 0, 0, w, h, 16, ['#000000', '#2a8a5a'], 1, 0.2)
}

// ---------------------------------------------------------------------------------------------
// Task 21.1: couch upholstery
// ---------------------------------------------------------------------------------------------

/** One texture tile covers this many metres, and holds this many wales (about 1 cm each). */
export const FABRIC_METRES_PER_REPEAT = 0.32
export const FABRIC_WALES = 32
/** Stitched seam lines sit this many px inside the tile edge. */
export const FABRIC_SEAM_INSET = 7

/**
 * 1990s corduroy/velvet upholstery, near-neutral (mean albedo about 0.8) so a material colour multiplier
 * sets the hue. Vertical ribs: an alternating dark groove and light crown per wale with a little noise,
 * fine pile specks, dashed stitched seams just inside the tile edges and soft edge shading. Tiles seamlessly
 * in the rib direction; the seams and the shading mark the cushion panels.
 */
export function drawCouchFabric(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  rect(c, 0, 0, w, h, '#cdc2c0')
  const wale = w / FABRIC_WALES
  for (let i = 0; i < FABRIC_WALES; i++) {
    const x = i * wale
    // Groove (dark), shoulder, crown highlight; strength varies a little from wale to wale.
    rect(c, x, 0, wale * 0.3, h, '#7d706e', 0.5 + rnd() * 0.12)
    rect(c, x + wale * 0.3, 0, wale * 0.15, h, '#9a8d8b', 0.25)
    rect(c, x + wale * 0.55, 0, wale * 0.25, h, '#ffffff', 0.14 + rnd() * 0.08)
  }
  // Fine pile noise.
  speckle(c, rnd, 0, 0, w, h, 900, ['#ffffff', '#6e6260', '#b4a8a6'], 1, 0.14)
  // Soft edge shading, then stitched seams (dashes) on top of it.
  vignette(c, w, h, 30, 0.24)
  const e = FABRIC_SEAM_INSET
  for (let p = 6; p + 8 <= w - 6; p += 14) {
    line(c, p, e, p + 8, e, '#4f4240', 1.5, 0.55)
    line(c, p, h - e, p + 8, h - e, '#4f4240', 1.5, 0.55)
  }
  for (let p = 6; p + 8 <= h - 6; p += 14) {
    line(c, e, p, e, p + 8, '#4f4240', 1.5, 0.55)
    line(c, w - e, p, w - e, p + 8, '#4f4240', 1.5, 0.55)
  }
}

// ---------------------------------------------------------------------------------------------
// Task 21.2: CRT television casing and glass
// ---------------------------------------------------------------------------------------------

/** Generic badge printed on the television housing. Not a real trademark. */
export const CRT_BADGE_TEXT = 'KV-1996'
/** Colour of the power LED dot. */
export const CRT_LED_COLOR = '#ff2a2a'

/**
 * Molded housing, 256 x 256, near neutral (the material multiplier sets charcoal / warm slate). One tile spans
 * the front shell width (0.846 m), so the front face shows canvas y 74..256 undistorted (metres per px about
 * 0.0033 in both axes). Coordinates were derived from the television part layout:
 *  - the bezel and screen cover x 16..210, y 87..244, so the visible front strips are: left x 0..16,
 *    right x 210..256 (dials, labels, LED), top y 74..87 (badge), bottom y 244..256;
 *  - side faces show the left 16% of the tile (u = depth), so the vertical louvers sit at x 4..40;
 *  - top faces show the bottom 16% of the tile (v = depth), so the horizontal louvers sit at y 222..244.
 * Dial centres match the two knob parts (x 244, y 120 and 150); the LED matches the LED part (x 249, y 244).
 */
export function drawCrtCasing(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  rect(c, 0, 0, w, h, '#b4b3b8')
  // Fine molded-plastic grain: light and dark specks, plus a few faint horizontal tool streaks.
  speckle(c, rnd, 0, 0, w, h, 1400, ['#ffffff', '#7c7b80', '#98979c'], 1, 0.16)
  for (let i = 0; i < 14; i++) rect(c, 0, Math.floor(rnd() * h), w, 1, '#ffffff', 0.05)
  // Side vent louvers (vertical slots) and top vent louvers (horizontal slots).
  for (let col = 0; col < 5; col++) {
    for (let row = 0; row < 7; row++) {
      const x = 4 + col * 8
      const y = 90 + row * 18
      rect(c, x, y, 4, 12, '#1a1a1d', 0.92)
      rect(c, x + 4, y, 1, 12, '#ffffff', 0.18)
    }
  }
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 11; col++) {
      const x = 24 + col * 16
      const y = 222 + row * 7
      rect(c, x, y, 12, 4, '#1a1a1d', 0.92)
      rect(c, x, y + 4, 12, 1, '#ffffff', 0.18)
    }
  }
  // Recessed bezel seam lines: a dark groove with a light lip next to it.
  line(c, 14.5, 74, 14.5, 256, '#4a494e', 1.5, 0.85)
  line(c, 16, 74, 16, 256, '#ffffff', 1, 0.2)
  line(c, 211, 74, 211, 256, '#4a494e', 1.5, 0.85)
  line(c, 14, 88.5, 212, 88.5, '#4a494e', 1.5, 0.85)
  // Badge on the top strip above the bezel.
  rect(c, 76, 75, 74, 11, '#2c2c30', 0.9)
  text(c, CRT_BADGE_TEXT, 113, 81, 'bold 9px monospace', '#ffffff', 0.95)
  // Channel (CH) and volume (VOL) dials: 12 tick marks around each knob, labels to the left, numbers above.
  for (const [cy, label] of [[120, 'CH'], [150, 'VOL']] as const) {
    for (let k = 0; k < 12; k++) {
      const a = (k * TAU) / 12
      line(c, 244 + Math.cos(a) * 10.5, cy + Math.sin(a) * 10.5, 244 + Math.cos(a) * 12.5, cy + Math.sin(a) * 12.5, '#ffffff', 1, 0.9)
    }
    text(c, label, 221, cy, 'bold 8px monospace', '#ffffff', 0.95)
  }
  text(c, '1 2 3 4 5 6', 233, 100, 'bold 5px monospace', '#ffffff', 0.85)
  text(c, '7 8 9 10 11 12', 233, 107, 'bold 5px monospace', '#ffffff', 0.85)
  // Power LED: soft halo and a solid dot (the LED part sits on top of it).
  disc(c, 249, 244, 7, CRT_LED_COLOR, 0.25)
  disc(c, 249, 244, 3, CRT_LED_COLOR)
  text(c, 'PWR', 228, 244, 'bold 5px monospace', '#ffffff', 0.85)
}

/**
 * Glass of the CRT, 256 x 256 nearest-filtered, drawn for a 1.29:1 screen (it stretches horizontally, which
 * suits wide monospace lettering). The colour multiplier is white, so this is what the player sees at t = 0:
 * a dim blue-black "NO SIGNAL / CH 03" card over a faint colour-bar pattern, RGB phosphor stripes, scanlines,
 * grain, a faint reflection highlight and a darkened curved-glass vignette with darker corners.
 */
export function drawCrtGlass(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  vertical(c, w, h, [[0, '#030816'], [1, '#071230']])
  // Faint test pattern: seven muted colour bars near the top and a grey ramp near the bottom.
  const bars = ['#8a8a96', '#8a8a30', '#308a8a', '#308a30', '#8a308a', '#8a3030', '#30308a']
  bars.forEach((col, i) => rect(c, 16 + i * 32, 24, 32, 40, col, 0.2))
  for (let i = 0; i < 8; i++) rect(c, 16 + i * 28, 214, 28, 14, '#c0c8e0', 0.04 + i * 0.012)
  // Message card.
  text(c, 'NO SIGNAL', w / 2 + 1, 119, 'bold 30px monospace', '#02050f', 0.9)
  text(c, 'NO SIGNAL', w / 2, 117, 'bold 30px monospace', '#a8c8ff', 0.85)
  text(c, 'CH 03', w / 2, 156, 'bold 22px monospace', '#7ea6e8', 0.8)
  text(c, 'INSERT TAPE', w / 2, 190, 'bold 14px monospace', '#6d8cc4', 0.6)
  // Phosphor triad: red, green and blue vertical stripes, one px wide on a 2 px pitch.
  const triad = ['#ff3030', '#30ff30', '#3030ff']
  for (let x = 0, i = 0; x < w; x += 2, i++) rect(c, x, 0, 1, h, triad[i % 3], 0.05)
  speckle(c, rnd, 0, 0, w, h, 500, ['#ffffff', '#4a6ab0', '#000000'], 1, 0.12)
  scanlines(c, w, h, 2, 0.34)
  // Reflection: a soft diagonal sheen at the top left and a thin highlight edge.
  gradientRect(c, 0, 0, 150, 110, 0, 0, 120, 100, [[0, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)']])
  line(c, 20, 12, 96, 12, '#ffffff', 2, 0.1)
  // Curved-glass vignette and darker corners.
  vignette(c, w, h, 56, 0.82)
  for (const [x, y] of [[0, 0], [w - 18, 0], [0, h - 18], [w - 18, h - 18]] as const) rect(c, x, y, 18, 18, '#000000', 0.35)
}

// ---------------------------------------------------------------------------------------------
// Task 22.1: VCR deck housing and VHS cassette shell
// ---------------------------------------------------------------------------------------------

/** Transport button labels printed under the VCR buttons, left to right. */
export const VCR_BUTTON_LABELS = ['PLAY', 'STOP', 'REW', 'EJECT'] as const
/** Generic marking on the VCR front. Not a real trademark. */
export const VCR_MARK_TEXT = 'HI-FI STEREO'
/** Task 26.1: charcoal-slate VCR chassis colour. It is the vcrDeck texture base colour and the flat fallback of the vcrDeck material. */
export const VCR_CHASSIS_COLOR = '#2b303a'
/** The VCR texture tile is 0.62 m wide (the VCR width) and 0.31 m tall: 2.4 mm per px in both axes. */
export const VCR_TILE_METRES = 0.62
export const VCR_TILE_ASPECT = 0.5

/**
 * VCR housing, 256 x 128. The housing part uses metric UVs with repeat = 0.62 m (the VCR width) and a 0.5
 * aspect, so one tile is 0.62 x 0.31 m and a px is 2.4 mm in both axes (text is not stretched). Layout:
 *  - the front face (0.1 m tall) shows canvas rows 87..128. The front-face button parts sit at x px 161 + 18.6 i,
 *    rows 109..118, so the four labels are printed below them (row 123) and "HI-FI STEREO" at the left;
 *  - the chrome trim line runs along the top front edge (row 88);
 *  - top and side faces show the rest, so the ventilation slots sit in rows 24..78 (top face middle).
 * Near-neutral dark metal: the material multiplier is white, so this is what the player sees.
 */
export function drawVcrDeck(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  rect(c, 0, 0, w, h, VCR_CHASSIS_COLOR)
  // Brushed grain: one streak per row, plus short brighter strokes (task 26.1: stronger contrast).
  for (let y = 0; y < h; y++) rect(c, 0, y, w, 1, rnd() < 0.5 ? '#0e1016' : '#8a909c', 0.07 + rnd() * 0.11)
  for (let i = 0; i < 90; i++) {
    const len = 18 + Math.floor(rnd() * 44)
    rect(c, Math.floor(rnd() * (w - len)), Math.floor(rnd() * h), len, 1, '#a4abb8', 0.16)
  }
  // Ventilation slots: two banks of six slots with a lower highlight lip.
  for (const x0 of [24, 152]) {
    for (let r = 0; r < 6; r++) {
      const y = 24 + r * 10
      rect(c, x0, y, 80, 4, '#05060a', 0.95)
      rect(c, x0, y + 4, 80, 1, '#a4abb8', 0.36)
    }
  }
  // Front: a brushed metallic trim band along the top edge, with a bright chrome line and a dark seam under it.
  gradientRect(c, 0, 89, w, 5, 0, 89, 0, 94, [[0, 'rgba(210,216,228,0.55)'], [0.5, 'rgba(120,128,142,0.4)'], [1, 'rgba(20,22,30,0.5)']])
  rect(c, 0, 88, w, 1, '#e4e8f0', 0.9)
  rect(c, 0, 89, w, 1, '#08080b', 0.6)
  rect(c, 0, 94, w, 1, '#05060a', 0.7)
  // Recessed cassette bay window (behind the 3D bezel and tape): dark glass, inner shadow, two tape reels.
  rect(c, 22, 96, 112, 17, '#07080c')
  frame(c, 22, 96, 112, 17, '#0a0b10', 2, 0.9)
  rect(c, 22, 112, 112, 1, '#9aa1ae', 0.5)
  for (const rx of [56, 100]) {
    disc(c, rx, 104.5, 6, '#2a2e38')
    ring(c, rx, 104.5, 6, '#b4bac8', 1, 0.8)
    for (let a = 0; a < 3; a++) {
      const ang = (a * TAU) / 3
      line(c, rx, 104.5, rx + Math.cos(ang) * 4.5, 104.5 + Math.sin(ang) * 4.5, '#05060a', 1, 0.9)
    }
    disc(c, rx, 104.5, 1.6, '#05060a')
  }
  line(c, 62, 109, 94, 109, '#05060a', 1, 0.8)
  rect(c, 24, 97, 108, 1, '#ffffff', 0.12)
  // Tactile buttons: silver caps with a bright top lip and a dark base; PLAY and EJECT carry an amber lamp strip.
  VCR_BUTTON_LABELS.forEach((label, i) => {
    const bx = 161 + i * 18.6
    rect(c, bx - 7.25, 109.4, 14.5, 8.3, '#0a0b10', 0.95)
    gradientRect(c, bx - 6.25, 110.2, 12.5, 6.6, 0, 110.2, 0, 116.8, [[0, '#e6eaf2'], [0.55, '#a4abb8'], [1, '#5c6270']])
    rect(c, bx - 6.25, 110.2, 12.5, 1, '#ffffff', 0.7)
    rect(c, bx - 6.25, 116, 12.5, 1, '#1c1e26', 0.6)
    frame(c, bx - 7.25, 109.4, 14.5, 8.3, '#9096a2', 1, 0.6)
    if (i === 0 || i === 3) rect(c, bx - 3.5, 112.6, 7, 1.6, '#ffb020', 0.95)
    text(c, label, bx, 123, 'bold 6px monospace', '#f0f3fa', 0.98)
  })
  text(c, VCR_MARK_TEXT, 70, 123, 'bold 6px monospace', '#e2e6f0', 0.95)
  rect(c, 14, 126, 112, 1, '#e4e8f0', 0.4)
  // Status LEDs at the right end of the front: glowing green (power) and red (record), each with a halo.
  for (const [lx, ly, core, halo] of [[246, 98, '#3dff7a', '#2be06a'], [246, 106, '#ff3b30', '#ff5a4a']] as const) {
    disc(c, lx, ly, 4, halo, 0.22)
    disc(c, lx, ly, 2.2, core)
    disc(c, lx - 0.6, ly - 0.6, 0.7, '#ffffff', 0.9)
  }
  // Fine panel screws in the corners of the front.
  for (const [sx, sy] of [[4, 92], [252, 92], [4, 124], [252, 124]] as const) {
    disc(c, sx, sy, 1.4, '#7c8390')
    line(c, sx - 1, sy, sx + 1, sy, '#14161c', 1, 0.8)
  }
  speckle(c, rnd, 0, 0, w, h, 120, ['#000000', '#c8ccd6'], 1, 0.1)
}
/** Tape labels written on the cassette shell. */
export const VHS_LABEL_TEXTS = ['TAPE 001', 'ARCHIVE'] as const

/** Text with a hand-written slant (a shear) when the context can transform; plain text otherwise. */
function handText(c: Ctx2D, s: string, x: number, y: number, font: string, color: string, alpha = 1, slant = -0.22): void {
  if (!c.setTransform) {
    text(c, s, x, y, font, color, alpha)
    return
  }
  c.save()
  // x' = x + slant * (y' - y): the baseline row stays put and the top leans right.
  c.setTransform(1, 0, slant, 1, -slant * y, 0)
  text(c, s, x, y, font, color, alpha)
  c.restore()
}

/**
 * VHS cassette shell, 128 x 128, near-neutral light-grey plastic: the material multiplier (tape black or tape
 * navy) sets the colour, so the detail reads as darker and lighter tones of it. A part uses metric UVs with
 * repeat = its length (x), so one tile spans the cassette length (0.19 m, 1.5 mm per px) and:
 *  - the top face (0.1 m deep) shows rows 61..128: dust-flap seam at the front (row 69), a handwritten
 *    "TAPE 001" label strip, then a window (rows 88..107) with two tape reels;
 *  - the long side faces and the ends (0.03 m tall) show rows 108..128: ribbed plastic with a "ARCHIVE"
 *    spine label.
 */
export function drawVhsShell(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  rect(c, 0, 0, w, h, '#a4a4ac')
  speckle(c, rnd, 0, 0, w, h, 90, ['#ffffff', '#6a6a72'], 1, 0.12)
  // Ribbed plastic: vertical grooves on the rows that face the sides, and above the label area.
  for (let x = 2; x < w; x += 4) {
    rect(c, x, 108, 1, h - 108, '#3a3a42', 0.28)
    rect(c, x + 1, 108, 1, h - 108, '#ffffff', 0.1)
    rect(c, x, 0, 1, 60, '#3a3a42', 0.2)
  }
  // Dust flap along the front edge: a darker band, a seam line, hinge marks.
  rect(c, 0, 61, w, 8, '#7e7e88', 0.6)
  rect(c, 0, 69, w, 1, '#101014', 0.85)
  rect(c, 0, 70, w, 1, '#ffffff', 0.25)
  for (const x of [8, 120]) rect(c, x, 63, 2, 5, '#2a2a30', 0.8)
  // Handwritten label strip on the top face.
  rect(c, 12, 72, 104, 14, '#e6e2d2')
  rect(c, 12, 72, 104, 1, '#b84a4a', 0.7)
  handText(c, VHS_LABEL_TEXTS[0], 42, 80, 'bold 8px monospace', '#1a1a2a', 0.95)
  scribble(c, rnd, 70, 80, 40, '#2a2a3a', 0.8)
  // Task 26.1: crisp label edges and two corner screws on the top face.
  frame(c, 12.5, 72.5, 103, 13, '#4a4a54', 1, 0.7)
  for (const sx of [6, 122]) disc(c, sx, 78, 1.5, '#5c5c66')
  // Window with two reels (arcs), the tape path between them and a lower edge highlight.
  rect(c, 14, 88, 100, 20, '#202026')
  frame(c, 14, 88, 100, 20, '#e0e0e8', 1, 0.5)
  for (const cx of [40, 88]) {
    disc(c, cx, 98, 8, '#5c6068')
    ring(c, cx, 98, 8, '#c8ccd6', 1, 0.8)
    for (let a = 0; a < 3; a++) {
      const ang = (a * TAU) / 3
      line(c, cx, 98, cx + Math.cos(ang) * 6, 98 + Math.sin(ang) * 6, '#16161a', 1, 0.9)
    }
    disc(c, cx, 98, 2.5, '#16161a')
  }
  line(c, 48, 105, 80, 105, '#0c0c10', 1, 0.8)
  // Spine label on the side rows.
  rect(c, 14, 111, 100, 13, '#e6e2d2')
  rect(c, 14, 111, 100, 1, '#b84a4a', 0.7)
  handText(c, VHS_LABEL_TEXTS[1], 40, 118, 'bold 8px monospace', '#1a1a2a', 0.95)
  scribble(c, rnd, 66, 118, 44, '#2a2a3a', 0.8)
  frame(c, 14.5, 111.5, 99, 12, '#4a4a54', 1, 0.7)
}

// ---------------------------------------------------------------------------------------------
// Task 22.2: cardboard crate, painted-steel filing cabinet and desk detail
// ---------------------------------------------------------------------------------------------

/** Stencilled lettering printed along the bottom of the cardboard texture. */
export const CRATE_STENCIL_TEXT = 'ARCHIVE // HANDLE WITH CARE'
/** Small header printed on the white shipping label. */
export const CRATE_LABEL_HEADER = 'SHIP TO'

/**
 * Corrugated cardboard, 256 x 256 (id `crate`, upgraded from 128 x 128 wood in task 22.2). Metric UVs use
 * repeat = the box width (archive boxes) or the label panel width (crates), so one tile spans the front and
 * the pixels stay square. Only the lower part (canvas rows 128..255, v 0..0.5) is visible on the smallest
 * boxes, so every decal sits there:
 *  - fine vertical flute lines and paper speckle over the whole tile;
 *  - a semi-transparent brown packing-tape band down the middle (x 112..143) and one across (rows 104..117);
 *  - a white shipping label (x 12..107, rows 136..203) with a header, address lines and a barcode-like stroke pattern;
 *  - two "this way up" arrows on the right;
 *  - the stencil text on row 232.
 */
export function drawCrate(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  rect(c, 0, 0, w, h, '#b48d5e')
  // Flutes: alternating dark and light vertical lines every 4 px.
  for (let x = 0; x < w; x += 4) {
    rect(c, x, 0, 1, h, '#6e5330', 0.14 + rnd() * 0.1)
    rect(c, x + 2, 0, 1, h, '#e2c490', 0.1)
  }
  // Paper speckle and a few darker blotches.
  speckle(c, rnd, 0, 0, w, h, 420, ['#5a4326', '#ecd3a4'], 1, 0.2)
  for (let i = 0; i < 12; i++) rect(c, Math.floor(rnd() * (w - 40)), Math.floor(rnd() * (h - 12)), 20 + Math.floor(rnd() * 20), 6 + Math.floor(rnd() * 6), '#7a5c34', 0.06)
  // Packing tape: a vertical centre band and a horizontal band, semi-transparent, with a shine edge.
  rect(c, 112, 0, 32, h, '#7a5524', 0.42)
  rect(c, 112, 0, 1, h, '#3a2810', 0.4)
  rect(c, 143, 0, 1, h, '#3a2810', 0.4)
  rect(c, 116, 0, 2, h, '#f0d8a0', 0.18)
  rect(c, 112, 0, 32, 1, '#3a2810', 0.25) // tape end
  rect(c, 0, 105, w, 1, '#f0d8a0', 0.25)
  rect(c, 0, 104, w, 14, '#7a5524', 0.4)
  rect(c, 0, 104, w, 1, '#3a2810', 0.35)
  rect(c, 0, 117, w, 1, '#3a2810', 0.35)
  // Shipping label: white sheet, header, address lines and a barcode.
  rect(c, 12, 136, 96, 68, '#f0eee6')
  frame(c, 12.5, 136.5, 95, 67, '#8a8a90', 1, 0.7)
  text(c, CRATE_LABEL_HEADER, 38, 145, 'bold 7px monospace', '#2a2a30', 0.9)
  for (let i = 0; i < 3; i++) rect(c, 20, 153 + i * 5, 50 + Math.floor(rnd() * 26), 2, '#4a4a54', 0.7)
  let bx = 20
  for (let i = 0; bx < 98; i++) {
    const bw = 1 + Math.floor(rnd() * 3)
    if (i % 2 === 0) rect(c, bx, 175, bw, 22, '#14141a', 0.92)
    bx += bw + 1
  }
  // Task 26.1: a crisp red stamp (framed box with hatching, no lettering) beside the label and a barcode quiet-zone line.
  rect(c, 12, 206, 96, 1, '#8a8a90', 0.5)
  frame(c, 156.5, 200.5, 80, 22, '#a02a24', 2, 0.85)
  for (let x = 160; x < 234; x += 6) line(c, x, 222, x + 6, 202, '#a02a24', 1, 0.45)
  for (const x of [168, 210]) {
    triangle(c, [[x, 142], [x - 11, 160], [x + 11, 160]], '#3a2a14', 0.7)
    rect(c, x - 4, 160, 8, 26, '#3a2a14', 0.7)
  }
  // Stencil lettering with a slightly lighter drop edge.
  text(c, CRATE_STENCIL_TEXT, 128.5, 233, 'bold 12px monospace', '#f0d8a0', 0.25)
  text(c, CRATE_STENCIL_TEXT, 128, 232, 'bold 12px monospace', '#2a2016', 0.85)
}

/** Printed on the typed index cards, top drawer first. The dash is an en dash, written as the escape \u2013 in source. */
export const CABINET_CARD_TEXTS = ['1994\u20131996', 'TAPES 01\u201340', 'CASE LOGS', 'MISC'] as const

/**
 * Metric frame of the filing-cabinet texture: one tile spans the cabinet body front (0.5 m wide, 1.31 m tall, the
 * four drawer bands). Pixels are therefore 2 mm wide and 5.1 mm tall; lettering is pre-squashed to compensate.
 */
export const CABINET_TILE_WIDTH_M = 0.5
export const CABINET_TILE_HEIGHT_M = 1.31
/** Drawer count of the tile (equal horizontal bands, bottom drawer first in v). */
export const CABINET_DRAWER_BANDS = 4
/** Label frame and card sizes in metres on the drawer front, and the card centre above the drawer centre as a tile fraction. */
export const CABINET_FRAME_M = { w: 0.28, h: 0.09 } as const
export const CABINET_CARD_M = { w: 0.23, h: 0.056 } as const
export const CABINET_CARD_V_OFFSET = 0.065
/** Rows 238..251 of the canvas hold only brushed steel (no seam, card or frame): used for strips, sides and the top lip. v range. */
export const CABINET_PLAIN_V = [(256 - 252) / 256, (256 - 238) / 256] as const

/** Centre of drawer `i` (0 = bottom) card as a tile v fraction (0 = bottom of the body front). */
export const cabinetCardV = (i: number): number => (i + 0.5) / CABINET_DRAWER_BANDS + CABINET_CARD_V_OFFSET

/** Text squashed vertically by `sy` (keeps the baseline row); plain text when the context cannot transform. */
function squashedText(c: Ctx2D, s: string, x: number, y: number, font: string, color: string, sy: number, fallbackFont: string): void {
  if (!c.setTransform) {
    text(c, s, x, y, fallbackFont, color)
    return
  }
  c.save()
  c.setTransform(1, 0, 0, sy, 0, y * (1 - sy))
  text(c, s, x, y, font, color)
  c.restore()
}

/**
 * Painted steel filing cabinet, 256 x 256, near-neutral light grey so the existing flat colours (as
 * multipliers) set the two greys. One tile spans the cabinet body front (see CABINET_TILE_*): the canvas is cut
 * into four 64-row drawer bands. Contents:
 *  - fine vertical brushing and faint paint mottling;
 *  - recessed seams (dark bands with a lower highlight) at rows 64, 128 and 192, and gap lines near both sides;
 *  - one chrome label frame (light border, darker inset) per band holding a typed index card with CABINET_CARD_TEXTS;
 *  - rows 238..251 stay plain steel (CABINET_PLAIN_V).
 */
export function drawMetalCabinet(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  const px = (m: number) => (m / CABINET_TILE_WIDTH_M) * w
  const py = (m: number) => (m / CABINET_TILE_HEIGHT_M) * h
  rect(c, 0, 0, w, h, '#cdd0d6')
  for (let x = 0; x < w; x++) rect(c, x, 0, 1, h, rnd() < 0.5 ? '#ffffff' : '#4a4e56', 0.03 + rnd() * 0.05)
  for (let i = 0; i < 36; i++) rect(c, Math.floor(rnd() * (w - 30)), Math.floor(rnd() * (h - 20)), 16 + Math.floor(rnd() * 14), 8 + Math.floor(rnd() * 12), rnd() < 0.5 ? '#ffffff' : '#6a6e78', 0.045)
  // Seams between the four drawers (kept away from the plain rows 238..251).
  const band = h / CABINET_DRAWER_BANDS
  for (let k = 1; k < CABINET_DRAWER_BANDS; k++) {
    const y = k * band
    rect(c, 0, y - 3, w, 2, '#5a5e66', 0.45)
    rect(c, 0, y - 1, w, 3, '#101216', 0.85)
    rect(c, 0, y + 2, w, 1, '#ffffff', 0.3)
  }
  // Drawer side gaps.
  for (const x of [Math.round(px(0.015)), w - Math.round(px(0.015)) - 1]) {
    for (let k = 0; k < CABINET_DRAWER_BANDS; k++) rect(c, x, k * band + 6, 1, band - 28, '#14161a', 0.35)
  }
  // Label frames and typed cards, top drawer first.
  const sy = py(1) / px(1)
  const fw = px(CABINET_FRAME_M.w)
  const fh = py(CABINET_FRAME_M.h)
  const cw = px(CABINET_CARD_M.w)
  const ch = py(CABINET_CARD_M.h)
  CABINET_CARD_TEXTS.forEach((label, d) => {
    const yc = (1 - cabinetCardV(CABINET_DRAWER_BANDS - 1 - d)) * h
    const x0 = w / 2 - fw / 2
    rect(c, x0, yc - fh / 2, fw, fh, '#eef0f4')
    frame(c, x0 + 0.5, yc - fh / 2 + 0.5, fw - 1, fh - 1, '#7c818c', 1, 0.9)
    rect(c, x0 + 3, yc - fh / 2 + 2, fw - 6, fh - 4, '#3c4048')
    rect(c, w / 2 - cw / 2, yc - ch / 2, cw, ch, '#f0ead2')
    rect(c, w / 2 - cw / 2, yc + ch / 2 - 1, cw, 1, '#b8a888', 0.7)
    squashedText(c, label, w / 2, yc, 'bold 15px monospace', '#24242c', sy, 'bold 8px monospace')
  })
  speckle(c, rnd, 0, 0, w, h, 90, ['#000000', '#ffffff'], 1, 0.08)
}

/** Metres covered by one deskDetail tile width. Cell width is half of it, so each 64 px cell covers DESK_DETAIL_TILE_M / 2. */
export const DESK_DETAIL_TILE_M = 0.44
/** Tile height over width of the 128 x 64 deskDetail texture. */
export const DESK_DETAIL_ASPECT = 0.5
/** First canvas row of the page-edge stripes at the bottom of the ruled-paper cell (v 0..0.0625). */
export const DESK_DETAIL_EDGE_ROW = 60

/**
 * Desk clutter detail, 128 x 64 (task 22.2 part B). Two 64 x 64 cells side by side:
 *  - left (x 0..63): notebook cover grain, light neutral grey so the material multiplier sets the colour;
 *  - right (x 64..127): ruled paper with 13 blue-grey lines every 4 rows, a red margin line at x 73 and, in the
 *    bottom four rows (DESK_DETAIL_EDGE_ROW..63), alternating light/dark page edges that show on the side of the page block.
 */
export function drawDeskDetail(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  const cell = w / 2
  rect(c, 0, 0, cell, h, '#c9ccd0')
  for (let y = 0; y < h; y++) rect(c, 0, y, cell, 1, rnd() < 0.5 ? '#ffffff' : '#3a3d44', 0.04 + rnd() * 0.07)
  for (let x = 0; x < cell; x += 3) rect(c, x, 0, 1, h, rnd() < 0.5 ? '#ffffff' : '#3a3d44', 0.03 + rnd() * 0.04)
  speckle(c, rnd, 0, 0, cell, h, 70, ['#000000', '#ffffff'], 1, 0.1)
  rect(c, cell, 0, cell, h, '#e6dfc6')
  speckle(c, rnd, cell, 0, cell, h, 40, ['#b8ad8c', '#fffaf0'], 1, 0.12)
  for (let k = 0; k < 13; k++) rect(c, cell, 6 + k * 4, cell, 1, '#5f78a0', 0.92)
  rect(c, cell + 9, 0, 1, DESK_DETAIL_EDGE_ROW, '#c0605a', 0.7)
  // Task 26.1: a crisp double margin, spiral binding holes along the top, and a few ink strokes on the ruled lines (all above the page-edge rows).
  rect(c, cell + 11, 0, 1, DESK_DETAIL_EDGE_ROW, '#c0605a', 0.4)
  for (let x = cell + 4; x < w - 2; x += 8) disc(c, x, 3, 1.2, '#7a7058', 0.8)
  for (let k = 0; k < 4; k++) line(c, cell + 14 + rnd() * 20, 11 + k * 8, cell + 36 + rnd() * 20, 11 + k * 8 + (rnd() - 0.5) * 2, '#23304f', 1, 0.8)
  // Cover: a firmer grain, a light edge lip and a darker lower edge so the cover has depth.
  rect(c, 0, 0, cell, 1, '#ffffff', 0.3)
  rect(c, 0, h - 1, cell, 1, '#2a2d34', 0.4)
  for (let y = DESK_DETAIL_EDGE_ROW; y < h; y++) rect(c, cell, y, cell, 1, y % 2 ? '#bfb698' : '#f4eedb')
}

// ---------------------------------------------------------------------------------------------
// Task 25.1: soft lamp cone falloff
// ---------------------------------------------------------------------------------------------

/** Alpha at the centre of the top row (the shade rim end of the cone). */
export const CONE_FALLOFF_TOP_ALPHA = 0.9
/** Rows (as a fraction of the height) over which the alpha fades from the top value to exactly 0. */
export const CONE_FALLOFF_FADE_END = 0.75
/** Horizontal taper: gradient stops (position across the width, share of the row alpha). Symmetric, 0 at both edges. */
export const CONE_FALLOFF_SIDE_STOPS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0.12, 0.18],
  [0.28, 0.62],
  [0.5, 1],
  [0.72, 0.62],
  [0.88, 0.18],
  [1, 0],
]

/** Vertical alpha profile: smoothstep from CONE_FALLOFF_TOP_ALPHA at row 0 down to 0 at CONE_FALLOFF_FADE_END of the height. */
export function coneFalloffRowAlpha(y: number, h: number): number {
  const t = Math.min(1, Math.max(0, y / (h * CONE_FALLOFF_FADE_END)))
  return CONE_FALLOFF_TOP_ALPHA * (1 - t * t * (3 - 2 * t))
}

/**
 * Soft light-cone falloff, 64 x 64 RGBA, fully deterministic (no random input). Canvas row 0 is the top of the
 * cone (the shade rim end; the cone geometry maps v = 1 to its top and the texture is flipped, see modelDetail.ts):
 * a warm translucent core that fades smoothly to alpha 0 at 75 % of the height, and tapers to 0 at the left and
 * right edges, so the cone has no hard side edge. One horizontal gradient per row.
 */
export function drawConeFalloff(c: Ctx2D, w: number, h: number, _seed: number): void {
  c.clearRect(0, 0, w, h)
  c.globalAlpha = 1
  for (let y = 0; y < h; y++) {
    const a = coneFalloffRowAlpha(y, h)
    const g = c.createLinearGradient(0, 0, w, 0)
    for (const [o, k] of CONE_FALLOFF_SIDE_STOPS) g.addColorStop(o, `rgba(255,236,196,${(a * k).toFixed(4)})`)
    c.fillStyle = g
    c.fillRect(0, y, w, 1)
  }
}

// ---------------------------------------------------------------------------------------------
// Task 27.1: arcade cabinet front detail and arcade manual spines (one 256 x 128 texture)
// ---------------------------------------------------------------------------------------------

export const CABINET_DETAIL_WIDTH = 256
export const CABINET_DETAIL_HEIGHT = 128

/** three.js BoxGeometry face order is +x, -x, +y, -y, +z, -z (four vertices each). The +z face is the front of a cabinet part and the spine of a book. */
export const BOX_FACE_FRONT = 4

/** A pixel rectangle of the canvas: x0, y0 (inclusive) to x1, y1 (exclusive). */
export type PxRect = readonly [number, number, number, number]
/** A UV rectangle (canvas top is v = 1). */
export interface UvRect {
  u0: number
  u1: number
  v0: number
  v1: number
}

/**
 * Regions of the cabinetAndManualDetail canvas. Left half (x 0..127): the arcade cabinet front, drawn at the real size of
 * the faces it is mapped onto (about 3.9 mm per px for the coin door, 7.8 mm per px for the rest):
 *  - door: the 0.26 x 0.34 m coin door (front face of the door box);
 *  - lip: the 1.0 x 0.07 m front face of the control deck (the player-facing lip, tilted with the deck);
 *  - kick: the 0.98 x 0.13 m kick plate;
 *  - plainSteel / plainDark: flat stripes that every other face of those boxes samples, so no legend shows on the sides.
 * Right half (x 128..255), redrawn in place in task 28.2 for the protruding manuals (0.085 x 0.31 x 0.29 m boxes):
 *  - strips: three spine strips, 20 x 128 px each (x 128..187), mapped onto the +x face of a manual (0.085 x 0.31 m, about 4.25 mm per px
 *    across and 2.4 mm per px along the spine);
 *  - covers: three cover panels, 64 x 42 px each, stacked in one column (x 188..251, y 0..41, 43..84, 86..127), mapped onto both side faces
 *    (0.29 x 0.31 m, about 4.5 mm per px across and 7.4 mm per px up, so shapes are drawn about 1.6x wider than tall to look square);
 *  - plains: three 4 x 38 px stripes of plain cloth (x 252..255), one per manual, in that manual's own colour, for the top, bottom and back.
 * The manual colours are painted into the texture (the manual instances multiply it by white).
 */
export const CABINET_DETAIL_REGIONS = Object.freeze({
  door: [0, 0, 66, 86] as PxRect,
  lip: [0, 88, 128, 97] as PxRect,
  kick: [0, 99, 128, 116] as PxRect,
  plainSteel: [0, 117, 128, 122] as PxRect,
  plainDark: [0, 123, 128, 128] as PxRect,
  strips: Object.freeze([
    [128, 0, 148, 128] as PxRect,
    [148, 0, 168, 128] as PxRect,
    [168, 0, 188, 128] as PxRect,
  ]),
  covers: Object.freeze([
    [188, 0, 252, 42] as PxRect,
    [188, 43, 252, 85] as PxRect,
    [188, 86, 252, 128] as PxRect,
  ]),
  plains: Object.freeze([
    [252, 2, 256, 40] as PxRect,
    [252, 44, 256, 82] as PxRect,
    [252, 86, 256, 124] as PxRect,
  ]),
})

/** Exact cloth colours of the three manuals (emerald, crimson, amber), painted into the texture as spine, cover and plain-cloth ground. */
export const MANUAL_COVER_COLOURS = Object.freeze(['#16a34a', '#e11d48', '#f59e0b'] as const)

/** Manual spine strips, left to right, and the title printed along each one. */
export const MANUAL_STRIP_KEYS = ['manual-snake', 'manual-maze', 'manual-frequency'] as const
export const MANUAL_SPINE_TITLES = Object.freeze(['01 SNAKE.EXE', '02 LAST EXIT', '03 DEAD FREQUENCY'] as const)
/** Legends on the control-deck lip, left to right, and on the coin door. */
export const CABINET_DECK_LEGENDS = Object.freeze(['MOVE', 'ACTION', '1P START'] as const)
export const CABINET_COIN_LEGEND = '25\u00a2'
export const CABINET_INSERT_LEGEND = 'INSERT COIN'
export const CABINET_SERIAL_TEXT = 'SER. 0996-LMC'

/** UV inset in pixels: sampling stays half a texel inside a region. */
const CABINET_UV_INSET_PX = 0.5

/** UV rectangle of a pixel region of the cabinetAndManualDetail canvas (canvas top is v = 1). */
export function detailUvRect(px: PxRect): UvRect {
  const i = CABINET_UV_INSET_PX
  return {
    u0: (px[0] + i) / CABINET_DETAIL_WIDTH,
    u1: (px[2] - i) / CABINET_DETAIL_WIDTH,
    v0: 1 - (px[3] - i) / CABINET_DETAIL_HEIGHT,
    v1: 1 - (px[1] + i) / CABINET_DETAIL_HEIGHT,
  }
}

/** Pixel x of the left half of the texture ends here: the cabinet art lives left of it, the manual spines right of it. */
export const CABINET_DETAIL_HALF_X = 128

/**
 * Scale of vertical spine text along its reading direction. The spine face (0.085 x 0.31 m on 20 x 128 px) is about 1.8x wider per px
 * across than along, so glyphs come out tall and narrow; a factor of 1 keeps the long titles inside 84 px at a legible size.
 */
const SPINE_TEXT_SQUASH = 1

/** Horizontal brushing: one faint light or dark streak per row inside the rectangle. */
function brushed(c: Ctx2D, rnd: () => number, x: number, y: number, w: number, h: number, base: string): void {
  rect(c, x, y, w, h, base)
  for (let r = 0; r < h; r++) rect(c, x, y + r, w, 1, rnd() < 0.5 ? '#ffffff' : '#14161c', 0.05 + rnd() * 0.08)
}

/**
 * Title printed along a spine, reading downward. With a transform-capable context the whole string is drawn rotated 90 degrees\n * clockwise; otherwise the letters are stacked, one per line.
 * The text stays inside x (cx +- 8) and y0..y1.
 */
function spineTitle(c: Ctx2D, s: string, cx: number, y0: number, y1: number, ink: string): void {
  const len = y1 - y0
  const chars = [...s].length
  if (c.setTransform) {
    const fs = Math.max(6, Math.min(9, Math.floor(len / (SPINE_TEXT_SQUASH * MARQUEE_CHAR_WIDTH_EM * chars))))
    c.save()
    // x' = -y + cx, y' = squash * x + centre: text x runs down the canvas, text y runs to the left.
    c.setTransform(0, SPINE_TEXT_SQUASH, -1, 0, cx, (y0 + y1) / 2)
    text(c, s, 0, 0, `bold ${fs}px monospace`, ink)
    c.restore()
    return
  }
  const step = len / chars
  const font = `bold ${Math.max(5, Math.min(9, Math.floor(step * 1.2)))}px monospace`
  ;[...s].forEach((ch, i) => {
    if (ch !== ' ') text(c, ch, cx, y0 + step * (i + 0.5), font, ink)
  })
}

/** Per-manual palette: dark CRT-style window ground, light glow tint, spine and title ink (dark on emerald and amber, pale on crimson, each at least 4.5:1). */
const MANUAL_ART = Object.freeze([
  { ground: '#07140c', glow: '#86efac', bright: '#dcfce7', ink: '#04210f' },
  { ground: '#1a0610', glow: '#fb7185', bright: '#ffe4e6', ink: '#ffe4e6' },
  { ground: '#1c1203', glow: '#fde68a', bright: '#fffbeb', ink: '#2b1700' },
] as const)

/** Small spine badge (14 x 26 px dark window) with a tiny icon of the game, in the top part of the spine. */
function spineIcon(c: Ctx2D, i: number, x0: number): void {
  const art = MANUAL_ART[i]
  rect(c, x0 + 3, 8, 14, 26, art.ground)
  frame(c, x0 + 3.5, 8.5, 13, 25, art.glow, 1, 0.6)
  if (i === 0) {
    // Serpent: an S of 3 x 2 px cells with a lit head.
    const cells: ReadonlyArray<readonly [number, number]> = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4]]
    for (const [col, row] of cells) rect(c, x0 + 5 + col * 3, 12 + row * 4, 3, 2, art.glow)
    rect(c, x0 + 11, 28, 3, 2, art.bright)
  } else if (i === 1) {
    // Corridor walls with one gold photo fragment.
    for (const [ax, ay, bx2, by2] of [[5, 12, 5, 26], [5, 26, 12, 26], [9, 16, 9, 30], [9, 16, 15, 16], [13, 20, 13, 30]] as const) line(c, x0 + ax, ay, x0 + bx2, by2, art.glow, 1)
    rect(c, x0 + 11, 10, 4, 3, '#facc15')
  } else {
    // Oscilloscope wave over a baseline.
    line(c, x0 + 5, 21, x0 + 15, 21, art.glow, 1, 0.4)
    c.globalAlpha = 1
    c.strokeStyle = art.bright
    c.lineWidth = 1
    c.beginPath()
    for (let k = 0; k <= 10; k++) {
      const y = 12 + k * 1.8
      const x = x0 + 10 + Math.sin(k * 1.2) * 4
      if (k === 0) c.moveTo(x, y)
      else c.lineTo(x, y)
    }
    c.stroke()
  }
}

/** One spine strip: manual-coloured cloth, foil bands, a game badge and the title running down the spine. */
function drawManualSpine(c: Ctx2D, i: number): void {
  const [x0, , x1] = CABINET_DETAIL_REGIONS.strips[i]
  const cx = (x0 + x1) / 2
  const art = MANUAL_ART[i]
  rect(c, x0, 0, x1 - x0, 128, MANUAL_COVER_COLOURS[i])
  // Rounded-hinge shading: a dark groove and a light edge on each side.
  rect(c, x0, 0, 1, 128, '#000000', 0.3)
  rect(c, x1 - 1, 0, 1, 128, '#000000', 0.3)
  rect(c, x0 + 1, 8, 1, 112, '#ffffff', 0.25)
  // Foil bands at the head and tail.
  rect(c, x0 + 1, 3, x1 - x0 - 2, 2, art.bright, 0.85)
  rect(c, x0 + 1, 123, x1 - x0 - 2, 2, art.bright, 0.85)
  spineIcon(c, i, x0)
  rect(c, x0 + 2, 37, x1 - x0 - 4, 1, art.ink, 0.7)
  spineTitle(c, MANUAL_SPINE_TITLES[i], cx, 40, 122, art.ink)
}

/** Cover 1: a pixel serpent made of a VHS tape winds across a CRT grid. 4 x 3 px cells look square on the 0.29 x 0.31 m face. */
function drawSnakeCover(c: Ctx2D, wx: number, wy: number): void {
  const art = MANUAL_ART[0]
  // CRT grid.
  for (let gx = 0; gx <= 54; gx += 6) rect(c, wx + gx, wy, 1, 22, MANUAL_COVER_COLOURS[0], 0.3)
  for (let gy = 0; gy <= 22; gy += 4) rect(c, wx, wy + gy, 54, 1, MANUAL_COVER_COLOURS[0], 0.3)
  // Body path: (col, row) on a 4 x 3 px lattice, offset (3, 1) inside the window.
  const path: ReadonlyArray<readonly [number, number]> = [
    [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [8, 4], [8, 3], [7, 3], [6, 3], [5, 3], [4, 3], [3, 3], [2, 3], [2, 2], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1],
  ]
  // Soft glow first, then the tape-brown-free emerald body.
  for (const [col, row] of path) rect(c, wx + 2 + col * 4, wy + row * 3, 5, 4, MANUAL_COVER_COLOURS[0], 0.4)
  path.forEach(([col, row], k) => rect(c, wx + 3 + col * 4, wy + 1 + row * 3, 3, 2, k % 2 ? art.glow : '#4ade80'))
  // Head: a tiny VHS cassette with two reels.
  rect(c, wx + 3 + 8 * 4, wy + 1 * 3, 8, 6, art.bright)
  frame(c, wx + 3 + 8 * 4 + 0.5, wy + 1 * 3 + 0.5, 7, 5, '#04210f', 1)
  rect(c, wx + 3 + 8 * 4 + 1.5, wy + 1 * 3 + 2, 2, 2, '#04210f')
  rect(c, wx + 3 + 8 * 4 + 4.5, wy + 1 * 3 + 2, 2, 2, '#04210f')
  // Prey pixel.
  rect(c, wx + 46, wy + 16, 3, 3, art.bright, 0.9)
}

/** Cover 2: labyrinth corridor walls with three golden photograph fragments. */
function drawMazeCover(c: Ctx2D, wx: number, wy: number): void {
  const art = MANUAL_ART[1]
  const walls: ReadonlyArray<readonly [number, number, number, number]> = [
    [6, 0, 6, 14], [6, 14, 18, 14], [12, 6, 12, 22], [12, 6, 26, 6], [20, 6, 20, 16], [20, 16, 34, 16], [26, 0, 26, 6], [32, 6, 32, 22], [32, 6, 46, 6], [40, 6, 40, 16], [40, 16, 53, 16], [46, 0, 46, 6],
  ]
  for (const [ax, ay, bx2, by2] of walls) line(c, wx + ax + 0.5, wy + ay + 0.5, wx + bx2 + 0.5, wy + by2 + 0.5, MANUAL_COVER_COLOURS[1], 3, 0.45)
  for (const [ax, ay, bx2, by2] of walls) line(c, wx + ax + 0.5, wy + ay + 0.5, wx + bx2 + 0.5, wy + by2 + 0.5, art.glow, 1, 0.95)
  // Three torn photograph fragments (gold prints with a dark picture area), each a different shape.
  const gold = '#facc15'
  rect(c, wx + 2, wy + 16, 6, 4, gold)
  rect(c, wx + 3, wy + 17, 3, 2, '#5a3a05')
  rect(c, wx + 23, wy + 9, 5, 4, gold)
  rect(c, wx + 24, wy + 10, 2, 2, '#5a3a05')
  triangle(c, [[wx + 43, wy + 8], [wx + 49, wy + 8], [wx + 43, wy + 13]], gold)
  rect(c, wx + 44, wy + 9, 2, 1, '#5a3a05')
}

/** Cover 3: a glowing oscilloscope trace tuned to 89.4 MHz. */
function drawFrequencyCover(c: Ctx2D, wx: number, wy: number): void {
  const art = MANUAL_ART[2]
  for (let gx = 0; gx <= 54; gx += 9) rect(c, wx + gx, wy, 1, 22, MANUAL_COVER_COLOURS[2], 0.3)
  for (let gy = 2; gy <= 22; gy += 5) rect(c, wx, wy + gy, 54, 1, MANUAL_COVER_COLOURS[2], 0.3)
  text(c, FREQUENCY_TEXT, wx + 40, wy + 4, 'bold 5px monospace', art.glow)
  const trace = (lw: number, color: string, alpha: number) => {
    c.globalAlpha = alpha
    c.strokeStyle = color
    c.lineWidth = lw
    c.beginPath()
    for (let k = 0; k <= 52; k++) {
      const x = wx + 1 + k
      const y = wy + 14 + Math.sin(k * 0.45) * 5 * (1 - Math.abs(k - 26) / 40)
      if (k === 0) c.moveTo(x, y)
      else c.lineTo(x, y)
    }
    c.stroke()
    c.globalAlpha = 1
  }
  trace(3, MANUAL_COVER_COLOURS[2], 0.4)
  trace(1, art.bright, 1)
}

/**
 * One cover panel (64 x 42 px): manual-coloured cloth with a dark 54 x 22 px window for the art and the title on a plate below.
 * Titles are horizontal and read upright on both side faces.
 */
function drawManualCover(c: Ctx2D, i: number): void {
  const [x0, y0, x1, y1] = CABINET_DETAIL_REGIONS.covers[i]
  const art = MANUAL_ART[i]
  rect(c, x0, y0, x1 - x0, y1 - y0, MANUAL_COVER_COLOURS[i])
  rect(c, x0, y0, x1 - x0, 1, '#ffffff', 0.25)
  rect(c, x0, y1 - 1, x1 - x0, 1, '#000000', 0.3)
  const wx = x0 + 5
  const wy = y0 + 4
  rect(c, wx, wy, 54, 22, art.ground)
  frame(c, wx - 0.5, wy - 0.5, 55, 23, art.ink, 1, 0.8)
  if (i === 0) drawSnakeCover(c, wx, wy)
  else if (i === 1) drawMazeCover(c, wx, wy)
  else drawFrequencyCover(c, wx, wy)
  rect(c, x0 + 5, y0 + 29, 54, 1, art.ink, 0.6)
  text(c, MANUAL_SPINE_TITLES[i], (x0 + x1) / 2, y0 + 35, `bold ${i === 2 ? 5 : 6}px monospace`, art.ink)
}

function drawCabinetDoor(c: Ctx2D, rnd: () => number): void {
  brushed(c, rnd, 0, 0, 66, 86, '#8a909a')
  // Steel frame: light top and left, dark bottom and right, then a recessed inner panel.
  rect(c, 0, 0, 66, 2, '#d4d9e2')
  rect(c, 0, 0, 2, 86, '#c0c6d0')
  rect(c, 64, 0, 2, 86, '#4a4f58')
  rect(c, 0, 84, 66, 2, '#3a3e46')
  rect(c, 4, 4, 58, 78, '#6c727d', 0.55)
  frame(c, 4.5, 4.5, 57, 77, '#2a2d34', 1)
  // INSERT COIN legend plate on the strip above the 3D coin slots.
  rect(c, 8, 6, 50, 11, '#15161b')
  frame(c, 8.5, 6.5, 49, 10, '#b0b6c0', 1)
  text(c, CABINET_INSERT_LEGEND, 33, 11.5, 'bold 7px monospace', '#ffc23a')
  // Louvred speaker grille between the two slot bezels.
  rect(c, 25, 21, 16, 24, '#0e0f13')
  for (let y = 23; y < 44; y += 3) {
    rect(c, 25, y, 16, 1, '#555a64')
    rect(c, 25, y + 1, 16, 1, '#000000', 0.6)
  }
  frame(c, 25.5, 21.5, 15, 23, '#9aa0aa', 1, 0.7)
  // Two glowing amber reject buttons with a coin legend under each.
  for (const cx of [15, 51]) {
    disc(c, cx, 64, 11, '#ffb030', 0.2)
    disc(c, cx, 64, 8, '#2a1a00')
    disc(c, cx, 64, 6.5, '#ff9a1a')
    disc(c, cx, 64, 4.5, '#ffc24a')
    disc(c, cx - 2, 62, 1.5, '#ffffff', 0.7)
    rect(c, cx - 9, 74, 18, 8, '#15161b')
    text(c, CABINET_COIN_LEGEND, cx, 78.5, 'bold 6px monospace', '#ffc23a')
  }
  text(c, 'REJECT', 33, 64, 'bold 5px monospace', '#15161b')
}

function drawDeckLip(c: Ctx2D): void {
  rect(c, 0, 88, 128, 9, '#1a1b22')
  rect(c, 0, 88, 128, 1, '#4a4e58')
  rect(c, 0, 96, 128, 1, '#0a0a0e')
  const plates: ReadonlyArray<readonly [number, number]> = [[22, 26], [64, 32], [106, 36]]
  CABINET_DECK_LEGENDS.forEach((label, i) => {
    const [cx, pw] = plates[i]
    rect(c, cx - pw / 2, 89, pw, 7, '#0d0e12')
    frame(c, cx - pw / 2 + 0.5, 89.5, pw - 1, 6, '#5a5e68', 1)
    text(c, label, cx, 92.5, 'bold 6px monospace', '#ffc23a')
  })
}

function drawKickPlate(c: Ctx2D, rnd: () => number): void {
  brushed(c, rnd, 0, 99, 128, 17, '#7d838d')
  rect(c, 0, 99, 128, 1, '#c8cdd6')
  rect(c, 0, 115, 128, 1, '#30343c')
  // Louvred vent block on the left, small serial plate on the right.
  rect(c, 6, 102, 58, 11, '#0e0f13')
  for (let y = 103; y < 112; y += 2) rect(c, 6, y, 58, 1, '#555a64')
  rect(c, 70, 102, 52, 11, '#e4e7ec')
  frame(c, 70.5, 102.5, 51, 10, '#6a707a', 1)
  text(c, CABINET_SERIAL_TEXT, 96, 107.5, 'bold 5px monospace', '#22252b')
  for (const x of [73, 119]) disc(c, x, 107.5, 1, '#7a808a')
}

/**
 * Arcade cabinet front and manual spines and covers, 256 x 128 (task 27.1, right half redrawn in task 28.2). See CABINET_DETAIL_REGIONS for the layout. Original text only
 * ("SER. 0996-LMC" is the club's own serial plate). Deterministic: seeded streaks, no Math.random.
 */
export function drawCabinetAndManualDetail(c: Ctx2D, w: number, h: number, seed: number): void {
  if (w !== CABINET_DETAIL_WIDTH || h !== CABINET_DETAIL_HEIGHT) throw new Error('cabinet detail size is fixed')
  const rnd = makeRng(seed)
  rect(c, 0, 0, CABINET_DETAIL_HALF_X, h, '#1a1b22')
  drawCabinetDoor(c, rnd)
  drawDeckLip(c)
  drawKickPlate(c, rnd)
  brushed(c, rnd, 0, 117, 128, 5, '#7f858f')
  // Right half (task 28.2): three spine strips, three cover panels and one plain-cloth stripe per manual, all in the manual's own colour.
  rect(c, CABINET_DETAIL_HALF_X, 0, w - CABINET_DETAIL_HALF_X, h, '#14141a')
  for (let i = 0; i < 3; i++) {
    drawManualSpine(c, i)
    drawManualCover(c, i)
    const [px0, py0, px1, py1] = CABINET_DETAIL_REGIONS.plains[i]
    rect(c, px0, py0, px1 - px0, py1 - py0, MANUAL_COVER_COLOURS[i])
  }
}

// Table, memory estimate
// ---------------------------------------------------------------------------------------------

export const TEXTURE_SPECS: Readonly<Record<TextureId, TextureSpec>> = Object.freeze({
  attractSnake: { id: 'attractSnake', width: 256, height: 256, filter: 'nearest', wrap: 'clamp', seed: 101, draw: drawAttractSnake },
  attractMaze: { id: 'attractMaze', width: 256, height: 256, filter: 'nearest', wrap: 'clamp', seed: 102, draw: drawAttractMaze },
  attractFrequency: { id: 'attractFrequency', width: 256, height: 256, filter: 'nearest', wrap: 'clamp', seed: 122, draw: drawAttractFrequency },
  marqueeSnake: { id: 'marqueeSnake', width: 256, height: 64, filter: 'nearest', wrap: 'clamp', seed: 123, draw: drawMarqueeSnake },
  marqueeMaze: { id: 'marqueeMaze', width: 256, height: 64, filter: 'nearest', wrap: 'clamp', seed: 124, draw: drawMarqueeMaze },
  marqueeFrequency: { id: 'marqueeFrequency', width: 256, height: 64, filter: 'nearest', wrap: 'clamp', seed: 125, draw: drawMarqueeFrequency },
  signFace: { id: 'signFace', width: 512, height: 128, filter: 'mipmap', wrap: 'clamp', seed: 103, draw: drawSignFace },
  posterSunset: { id: 'posterSunset', width: 256, height: 512, filter: 'mipmap', wrap: 'clamp', seed: 104, draw: drawPosterSunset },
  posterReel: { id: 'posterReel', width: 256, height: 512, filter: 'mipmap', wrap: 'clamp', seed: 105, draw: drawPosterReel },
  shiftPoster: { id: 'shiftPoster', width: 256, height: 512, filter: 'mipmap', wrap: 'clamp', seed: 106, draw: drawShiftPoster },
  shiftPlaque: { id: 'shiftPlaque', width: 256, height: 128, filter: 'mipmap', wrap: 'clamp', seed: 107, draw: drawShiftPlaque },
  floor: { id: 'floor', width: 128, height: 128, filter: 'mipmap', wrap: 'repeat', seed: 108, draw: drawFloor },
  wood: { id: 'wood', width: 128, height: 128, filter: 'mipmap', wrap: 'repeat', seed: 109, draw: (c, w, h, s) => drawWood(c, w, h, s, WOOD_LIGHT) },
  woodDark: { id: 'woodDark', width: 128, height: 128, filter: 'mipmap', wrap: 'repeat', seed: 110, draw: (c, w, h, s) => drawWood(c, w, h, s, WOOD_DARK) },
  crate: { id: 'crate', width: 256, height: 256, filter: 'mipmap', wrap: 'repeat', seed: 111, draw: drawCrate },
  grille: { id: 'grille', width: 128, height: 128, filter: 'mipmap', wrap: 'clamp', seed: 112, draw: drawGrille },
  spineAtlas: { id: 'spineAtlas', width: SPINE_ATLAS_WIDTH, height: SPINE_ATLAS_HEIGHT, filter: 'mipmap', wrap: 'clamp', seed: 114, draw: drawSpineAtlas },
  wallPanel: { id: 'wallPanel', width: 256, height: 256, filter: 'mipmap', wrap: 'repeat', seed: 115, draw: drawWallPanel },
  rugWoven: { id: 'rugWoven', width: 256, height: 256, filter: 'mipmap', wrap: 'clamp', seed: 116, draw: drawRugWoven },
  corkBoard: { id: 'corkBoard', width: 256, height: 256, filter: 'mipmap', wrap: 'clamp', seed: 117, draw: drawCorkBoard },
  lampGlow: { id: 'lampGlow', width: 128, height: 128, filter: 'mipmap', wrap: 'clamp', seed: 118, draw: drawLampGlow },
  smpteBars: { id: 'smpteBars', width: 256, height: 128, filter: 'nearest', wrap: 'clamp', seed: 119, draw: drawSmpteBars },
  timecode: { id: 'timecode', width: 128, height: 32, filter: 'nearest', wrap: 'clamp', seed: 121, draw: drawTimecode },
  couchFabric: { id: 'couchFabric', width: 256, height: 256, filter: 'mipmap', wrap: 'repeat', seed: 126, draw: drawCouchFabric },
  crtCasing: { id: 'crtCasing', width: 256, height: 256, filter: 'mipmap', wrap: 'clamp', seed: 127, draw: drawCrtCasing },
  crtGlass: { id: 'crtGlass', width: 256, height: 256, filter: 'nearest', wrap: 'clamp', seed: 128, draw: drawCrtGlass },
  vcrDeck: { id: 'vcrDeck', width: 256, height: 128, filter: 'mipmap', wrap: 'repeat', seed: 129, draw: drawVcrDeck },
  vhsShell: { id: 'vhsShell', width: 128, height: 128, filter: 'mipmap', wrap: 'clamp', seed: 130, draw: drawVhsShell },
  metalCabinet: { id: 'metalCabinet', width: 256, height: 256, filter: 'mipmap', wrap: 'repeat', seed: 131, draw: drawMetalCabinet },
  deskDetail: { id: 'deskDetail', width: 128, height: 64, filter: 'mipmap', wrap: 'repeat', seed: 132, draw: drawDeskDetail },
  coneFalloff: { id: 'coneFalloff', width: 64, height: 64, filter: 'linear', wrap: 'clamp', seed: 133, draw: drawConeFalloff },
  cabinetAndManualDetail: { id: 'cabinetAndManualDetail', width: CABINET_DETAIL_WIDTH, height: CABINET_DETAIL_HEIGHT, filter: 'mipmap', wrap: 'clamp', seed: 134, draw: drawCabinetAndManualDetail },
})

export const TEXTURE_IDS = Object.keys(TEXTURE_SPECS) as TextureId[]

export const isPowerOfTwo = (n: number): boolean => Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0

/** Texture memory estimate in bytes: RGBA8, plus about one third more for a full mip chain. */
export function textureMemoryBytes(spec: Pick<TextureSpec, 'width' | 'height' | 'filter'>): number {
  return Math.round(spec.width * spec.height * 4 * (spec.filter === 'mipmap' ? 1.33 : 1))
}

export function totalTextureMemoryBytes(specs: Iterable<Pick<TextureSpec, 'width' | 'height' | 'filter'>> = Object.values(TEXTURE_SPECS)): number {
  let n = 0
  for (const s of specs) n += textureMemoryBytes(s)
  return n
}

/** Draws texture `id` with its own seed (or an override). */
export function drawTexture(id: TextureId, ctx: Ctx2D, seed?: number): void {
  const spec = TEXTURE_SPECS[id]
  spec.draw(ctx, spec.width, spec.height, seed ?? spec.seed)
}
