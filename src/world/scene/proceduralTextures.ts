/**
 * Pure drawing helpers for the procedural textures (task 15.7). No three.js, React or DOM imports:
 * every function draws onto a minimal 2D-context interface, so tests run them against a recording
 * fake. The same seed always produces the same call sequence (seeded mulberry32, no Math.random).
 *
 * Texture budget (all power-of-two, estimate = width * height * 4 bytes, x 1.33 when mipmapped):
 *   signFace     512x128 mip       0.33 MB     posterSunset 256x512 mip  0.70 MB
 *   posterReel, shiftPoster 256x512 mip 0.70 MB each     shiftPlaque 256x128 mip 0.17 MB
 *   floor, wood, woodDark, crate, grille: 128x128 mip, 0.09 MB each     spineAtlas 512x256 mip 0.67 MB (task 18.2).
 *   Task 18.3: corkBoard 512x512 mip 1.33 MB, rugWoven 256x256 mip 0.33 MB, lampGlow 64x64 mip 0.02 MB.
 *   Task 19.2: wallPanel 256x256 mip 0.33 MB, smpteBars 256x128 nearest 0.13 MB, timecode 128x32 nearest 0.02 MB.
 *   Task 20.2: three attract screens 256x256 nearest 0.25 MB each and three marquees 256x64 nearest 0.06 MB each
 *   replace the old arcadeScreen, marquee, outOfOrder and deck textures.
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

export type TextureFilter = 'nearest' | 'mipmap'

export interface TextureSpec {
  id: TextureId
  width: number
  height: number
  /** `nearest` = pixel art, no mipmaps. `mipmap` = linear with mipmaps. */
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
  scanlines(c, w, h, 2, 0.24)
  vignette(c, w, h, 40, 0.6)
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
  scanlines(c, w, h, 2, 0.26)
  vignette(c, w, h, 44, 0.6)
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
  scanlines(c, w, h, 2, 0.26)
  vignette(c, w, h, 40, 0.6)
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
    rect(c, k * tw, 0, 1, h, '#17131c', 0.9)
    rect(c, 0, k * th, w, 1, '#17131c', 0.9)
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
const WOOD_CRATE: WoodPalette = { base: '#947444', grain: '#5e4626', knot: '#46321a' }

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
  for (const y of [0, h / 2]) rect(c, 0, y, w, 2, palette.knot, 0.7)
  for (let k = 0; k < 2; k++) {
    const x = 24 + rnd() * (w - 48)
    const y = 20 + rnd() * (h - 40)
    disc(c, x, y, 6, palette.knot, 0.55)
    ring(c, x, y, 9, palette.grain, 1, 0.6)
    ring(c, x, y, 12, palette.grain, 1, 0.35)
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
  ;[...word].forEach((ch, i) => {
    if (ch !== ' ') text(c, ch, cx, y0 + i * step, font, color)
  })
}

/** Tiny unreadable "title" strokes: short horizontal marks of varying length, stacked down the spine. */
function glyphMarks(c: Ctx2D, rnd: () => number, cx: number, y0: number, step: number, count: number, color: string): void {
  for (let i = 0; i < count; i++) {
    const w = 14 + Math.floor(rnd() * 24)
    rect(c, cx - w / 2, y0 + i * step, w, 3, color, 0.8)
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
      stackedWord(c, 'ARCHIVE', cx, 72, 14, 'bold 12px monospace', '#3a3a3a')
      rect(c, x0 + 14, 182, 36, 3, '#6a6a6a')
      rect(c, x0 + 14, 192, 36, 3, '#6a6a6a')
      break
    }
    case 2: {
      // Two-tone: pale upper, dark lower, volume number.
      rect(c, x0, 0, W, 150, '#eeeeee')
      rect(c, x0, 150, W, H - 150, '#a0a0a0')
      rect(c, x0, 148, W, 4, '#5e5e5e')
      stackedWord(c, 'VOL. 3', cx, 30, 22, 'bold 16px monospace', '#444444')
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
      stackedWord(c, 'REWIND', cx, 60, 20, 'bold 15px monospace', '#3a3a3a')
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
      stackedWord(c, 'ARCHIVE', cx, 74, 18, 'bold 14px monospace', '#2e2e2e')
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
  for (const [s, col] of steps) diamond(cx, cy, X(0.95 * s), Y(0.58 * s), col)
  for (const dx of [-0.45, 0.45]) diamond(cx + X(dx), cy, X(0.09), Y(0.09), '#d2bc82')
  // Weft lines, thread noise, a worn patch and the end fringes.
  for (let y = 0; y < h; y += 2) rect(c, 0, y, w, 1, y % 4 === 0 ? '#ffffff' : '#000000', y % 4 === 0 ? 0.04 : 0.09)
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

/** Tiny stroke handwriting: a jittery polyline with occasional pen lifts. Unreadable on purpose. */
function scribble(c: Ctx2D, rnd: () => number, x: number, y: number, w: number, color: string, alpha = 0.85): void {
  c.globalAlpha = alpha
  c.strokeStyle = color
  c.lineWidth = 1
  c.beginPath()
  c.moveTo(x, y)
  for (let xx = x + 3; xx < x + w; xx += 3) {
    const yy = y + (rnd() - 0.5) * 5
    if (rnd() < 0.12) c.moveTo(xx + 3, yy)
    else c.lineTo(xx, yy)
  }
  c.stroke()
  c.globalAlpha = 1
}

function pushPin(c: Ctx2D, x: number, y: number, color: string): void {
  disc(c, x + 2, y + 3, 5, '#000000', 0.3)
  disc(c, x, y, 5, color)
  disc(c, x - 1.5, y - 1.5, 1.8, '#ffffff', 0.7)
}

/** Ruled index card with a red header line, an optional title and handwriting lines. */
function indexCard(c: Ctx2D, rnd: () => number, x: number, y: number, w: number, h: number, title: string | null, font: string, ink: string): void {
  rect(c, x + 3, y + 4, w, h, '#000000', 0.25)
  rect(c, x, y, w, h, '#efe8cf')
  rect(c, x, y + 18, w, 1, '#c85a5a', 0.8)
  for (let ly = y + 32; ly < y + h - 6; ly += 13) rect(c, x + 4, ly, w - 8, 1, '#8ab0d8', 0.6)
  if (title) text(c, title, x + w / 2, y + 9, font, ink)
  for (let ly = y + 40; ly < y + h - 8; ly += 13) scribble(c, rnd, x + 8, ly, w - 16 - rnd() * 30, '#2a2a3a')
}

/** Polaroid: light frame, dark photo area with a simple window and silhouette, handwritten caption. */
function polaroid(c: Ctx2D, rnd: () => number, cx: number, cy: number, w: number, h: number, angle: number): void {
  tilted(c, cx + 3, cy + 4, w, h, angle, '#000000', 0.25)
  tilted(c, cx, cy, w, h, angle, '#ece8dc')
  const side = w - 16
  const py0 = cy - h / 2 + 8 + side / 2
  tilted(c, cx, py0, side, side, angle, '#1d1a24')
  tilted(c, cx - side * 0.2, py0 - side * 0.1, side * 0.3, side * 0.36, angle, '#34344c')
  disc(c, cx + side * 0.18, py0 + side * 0.1, side * 0.13, '#0c0a10')
  rect(c, cx + side * 0.06, py0 + side * 0.2, side * 0.26, side * 0.28, '#0c0a10')
  speckle(c, rnd, cx - side / 2 + 2, py0 - side / 2 + 2, side - 4, side - 4, 24, ['#ffffff', '#000000'], 1, 0.18)
  scribble(c, rnd, cx - w / 2 + 12, cy + h / 2 - 12, w - 28, '#3a3a4a', 0.7)
}

/** Sticky note: tilted coloured square with a darker lower edge and two lines of handwriting. */
function stickyNote(c: Ctx2D, rnd: () => number, cx: number, cy: number, s: number, angle: number, color: string, edge: string): void {
  tilted(c, cx + 2, cy + 3, s, s, angle, '#000000', 0.25)
  tilted(c, cx, cy, s, s, angle, color)
  tilted(c, cx, cy + s / 2 - 3, s, 6, angle, edge, 0.6)
  scribble(c, rnd, cx - s / 2 + 8, cy - 6, s - 16, '#3a2a2a', 0.8)
  scribble(c, rnd, cx - s / 2 + 8, cy + 8, s - 24, '#3a2a2a', 0.8)
}

/**
 * Cork bulletin board for a 1.3 m x 0.9 m plane (the canvas is square, so it is stretched about 1.44x
 * vertically; shapes are sized for that). Original content only: index cards, Polaroids, sticky notes,
 * red string between push-pins, and a few generic archive words.
 */
export function drawCorkBoard(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  rect(c, 0, 0, w, h, '#a47a4a')
  speckle(c, rnd, 0, 0, w, h, 700, ['#7e5a34', '#b99060', '#5e4226', '#c8a470'], 2, 0.5)
  speckle(c, rnd, 0, 0, w, h, 120, ['#3e2a18', '#d8b888'], 3, 0.25)
  // Cards (axis aligned so the lettering is straight).
  indexCard(c, rnd, 24, 28, 132, 100, 'TAPE 001', 'bold 16px monospace', '#1a1a2a')
  indexCard(c, rnd, 292, 30, 150, 100, 'ARCHIVE 09', 'bold 16px monospace', '#1a1a2a')
  indexCard(c, rnd, 226, 184, 164, 110, null, 'bold 13px monospace', '#8a1a1a')
  text(c, 'WHO TAPED OVER?', 226 + 82, 184 + 9, 'bold 13px monospace', '#8a1a1a')
  rect(c, 226 + 14, 184 + 14, 136, 2, '#8a1a1a', 0.7)
  indexCard(c, rnd, 24, 318, 150, 110, 'DO NOT ERASE', 'bold 11px monospace', '#1a1a2a')
  // Polaroids and sticky notes.
  polaroid(c, rnd, 224, 84, 96, 118, -0.05)
  polaroid(c, rnd, 158, 222, 96, 118, 0.06)
  polaroid(c, rnd, 238, 380, 96, 118, 0.04)
  polaroid(c, rnd, 436, 392, 96, 118, -0.06)
  stickyNote(c, rnd, 478, 66, 54, 0.08, '#f09ab0', '#c8708a')
  stickyNote(c, rnd, 58, 204, 62, -0.07, '#f2e060', '#c8b440')
  stickyNote(c, rnd, 448, 204, 62, 0.05, '#9ad88a', '#70b060')
  stickyNote(c, rnd, 346, 352, 58, -0.04, '#8ac8e8', '#5a9cc0')
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
    line(c, p[0] + 1, p[1] + 2, q[0] + 1, q[1] + 2, '#000000', 1.5, 0.25)
    line(c, p[0], p[1], q[0], q[1], '#c42222', 1.5, 0.92)
  }
  const pinColors = ['#d62a2a', '#2a5ad6', '#e8c42a', '#2aa84a'] as const
  Object.values(pins).forEach((p, i) => pushPin(c, p[0], p[1], pinColors[i % pinColors.length]))
  vignette(c, w, h, 24, 0.35)
}

/** Soft warm halo for the additive lamp glow planes: concentric translucent discs on a transparent canvas. */
export function drawLampGlow(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  c.clearRect(0, 0, w, h)
  for (let r = w / 2 - 2; r > 3; r -= 2.5) disc(c, w / 2, h / 2, r, '#ffb060', 0.06 + rnd() * 0.01)
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
  crate: { id: 'crate', width: 128, height: 128, filter: 'mipmap', wrap: 'repeat', seed: 111, draw: (c, w, h, s) => drawWood(c, w, h, s, WOOD_CRATE) },
  grille: { id: 'grille', width: 128, height: 128, filter: 'mipmap', wrap: 'clamp', seed: 112, draw: drawGrille },
  spineAtlas: { id: 'spineAtlas', width: SPINE_ATLAS_WIDTH, height: SPINE_ATLAS_HEIGHT, filter: 'mipmap', wrap: 'clamp', seed: 114, draw: drawSpineAtlas },
  wallPanel: { id: 'wallPanel', width: 256, height: 256, filter: 'mipmap', wrap: 'repeat', seed: 115, draw: drawWallPanel },
  rugWoven: { id: 'rugWoven', width: 256, height: 256, filter: 'mipmap', wrap: 'clamp', seed: 116, draw: drawRugWoven },
  corkBoard: { id: 'corkBoard', width: 512, height: 512, filter: 'mipmap', wrap: 'clamp', seed: 117, draw: drawCorkBoard },
  lampGlow: { id: 'lampGlow', width: 64, height: 64, filter: 'mipmap', wrap: 'clamp', seed: 118, draw: drawLampGlow },
  smpteBars: { id: 'smpteBars', width: 256, height: 128, filter: 'nearest', wrap: 'clamp', seed: 119, draw: drawSmpteBars },
  timecode: { id: 'timecode', width: 128, height: 32, filter: 'nearest', wrap: 'clamp', seed: 121, draw: drawTimecode },
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
