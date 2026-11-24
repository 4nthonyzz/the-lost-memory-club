/**
 * Pure drawing helpers for the procedural textures (task 15.7). No three.js, React or DOM imports:
 * every function draws onto a minimal 2D-context interface, so tests run them against a recording
 * fake. The same seed always produces the same call sequence (seeded mulberry32, no Math.random).
 *
 * Texture budget (all power-of-two, estimate = width * height * 4 bytes, x 1.33 when mipmapped):
 *   arcadeScreen 512x256 nearest   0.50 MB     posterSunset 256x512 mip  0.70 MB
 *   marquee      512x128 nearest   0.25 MB     posterReel   256x512 mip  0.70 MB
 *   signFace     512x128 mip       0.33 MB     shiftPoster  256x512 mip  0.70 MB
 *   floor, wood, woodDark, crate, grille: 128x128 mip, 0.09 MB each     shiftPlaque 256x128 mip 0.17 MB
 *   deck 256x128 mip 0.17 MB. The total is checked against TEXTURE_MEMORY_BUDGET_BYTES in tests.
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
  | 'arcadeScreen'
  | 'marquee'
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
  | 'deck'

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

/** Attract screen. Dim phosphor green so the Memory_Shift colour multiply still reads. */
export function drawArcadeScreen(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  vertical(c, w, h, [[0, '#031009'], [1, '#05160d']])
  // Phosphor dot grid.
  for (let y = 3; y < h; y += 6) for (let x = 3; x < w; x += 6) rect(c, x, y, 2, 2, '#1c7a52', 0.16)
  frame(c, 10, 10, w - 20, h - 20, '#1f8a5c', 3)
  text(c, 'HI 000000', 76, 30, 'bold 14px monospace', '#3fbf8a', 0.8)
  text(c, 'LOST MEMORY', w / 2 + 3, 85, 'bold 56px monospace', '#7a1f5a')
  text(c, 'LOST MEMORY', w / 2, 82, 'bold 56px monospace', '#7dffc0')
  rect(c, 96, 118, w - 192, 3, '#2fa874')
  text(c, 'PRESS E', w / 2, 152, 'bold 34px monospace', '#c8ffe4')
  // Pixel snake with a step in the middle, and an apple.
  for (let i = 0; i < 9; i++) {
    const y = 198 - (i >= 3 && i < 6 ? 14 : 0)
    rect(c, 60 + i * 14, y, 12, 12, i === 8 ? '#e8fff4' : '#4fe0a0')
  }
  rect(c, 192, 200, 10, 10, '#ff5a6a')
  // Small memory-tape cassette motif.
  rect(c, 330, 186, 96, 52, '#0e2a1e')
  frame(c, 330, 186, 96, 52, '#4fe0a0', 2)
  rect(c, 346, 194, 64, 14, '#183a2a')
  disc(c, 356, 222, 8, '#05160d')
  disc(c, 400, 222, 8, '#05160d')
  ring(c, 356, 222, 8, '#4fe0a0', 2)
  ring(c, 400, 222, 8, '#4fe0a0', 2)
  speckle(c, rnd, 0, 0, w, h, 60, ['#2fa874', '#7dffc0', '#0a3a28'], 2, 0.25)
  scanlines(c, w, h, 2, 0.22)
  vignette(c, w, h, 40, 0.55)
}

export function drawMarquee(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  gradientRect(c, 0, 0, w, h, 0, 0, w, 0, [[0, '#5a1c00'], [0.5, '#ffb23a'], [1, '#5a1c00']])
  gradientRect(c, 14, 14, w - 28, h - 28, 0, 14, 0, h - 14, [[0, '#2a0a3a'], [1, '#4a1060']])
  frame(c, 14, 14, w - 28, h - 28, '#ffd27a', 2)
  text(c, 'ARCADE', w / 2 + 3, 61, 'bold 60px monospace', '#a02a00')
  text(c, 'ARCADE', w / 2, 58, 'bold 60px monospace', '#ffd27a')
  text(c, 'LOST MEMORY CLUB', w / 2, 100, 'bold 20px monospace', '#ffe9b8')
  // Border trim bulbs with a soft halo.
  for (let x = 20; x <= w - 20; x += 32) {
    for (const y of [7, h - 7]) {
      disc(c, x, y, 6, '#ffb23a', 0.3)
      disc(c, x, y, 3.5, '#fff2c0')
    }
  }
  speckle(c, rnd, 14, 14, w - 28, h - 28, 40, ['#ffffff', '#000000'], 1, 0.08)
}

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

/**
 * Arcade control deck markings: a joystick ring and six button rings with label bars (no text).
 * Positions follow the deck part layout: the canvas top is the back of the deck, the bottom is the player side.
 */
export const DECK_BUTTON_COLORS = ['#d62a2a', '#e8c42a', '#2aa84a', '#2a5ad6', '#e8e8ec', '#e87a2a'] as const
export function drawDeck(c: Ctx2D, w: number, h: number, seed: number): void {
  const rnd = makeRng(seed)
  vertical(c, w, h, [[0, '#211c30'], [1, '#17131f']])
  frame(c, 6, 6, w - 12, h - 12, '#4a4062', 2)
  // Joystick: base ring, guide cross.
  ring(c, 77, 70, 16, '#8a82a8', 2)
  ring(c, 77, 70, 8, '#8a82a8', 1, 0.7)
  line(c, 55, 70, 99, 70, '#4a4062', 1)
  line(c, 77, 48, 77, 92, '#4a4062', 1)
  // Six buttons, two rows of three.
  DECK_BUTTON_COLORS.forEach((col, i) => {
    const x = 133 + (i % 3) * 22
    const y = i < 3 ? 52 : 82
    ring(c, x, y, 9, col, 2)
    rect(c, x - 6, y + 12, 12, 2, col, 0.6)
  })
  // Start buttons.
  rect(c, 118, 106, 18, 6, '#8a82a8', 0.8)
  rect(c, 142, 106, 18, 6, '#8a82a8', 0.8)
  // Coin slot mark.
  rect(c, 200, 96, 28, 4, '#8a82a8', 0.8)
  speckle(c, rnd, 8, 8, w - 16, h - 16, 40, ['#000000', '#8a82a8'], 1, 0.15)
}

// ---------------------------------------------------------------------------------------------
// Table, memory estimate
// ---------------------------------------------------------------------------------------------

export const TEXTURE_SPECS: Readonly<Record<TextureId, TextureSpec>> = Object.freeze({
  arcadeScreen: { id: 'arcadeScreen', width: 512, height: 256, filter: 'nearest', wrap: 'clamp', seed: 101, draw: drawArcadeScreen },
  marquee: { id: 'marquee', width: 512, height: 128, filter: 'nearest', wrap: 'clamp', seed: 102, draw: drawMarquee },
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
  deck: { id: 'deck', width: 256, height: 128, filter: 'mipmap', wrap: 'clamp', seed: 113, draw: drawDeck },
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
