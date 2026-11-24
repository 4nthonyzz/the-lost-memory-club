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
 *   deck 256x128 mip 0.17 MB     spineAtlas 512x256 mip 0.67 MB (task 18.2).
 *   Task 18.3: wallPanel 512x512 mip 1.33 MB, corkBoard 512x512 mip 1.33 MB, rugWoven 256x256 mip 0.33 MB,
 *   lampGlow 64x64 mip 0.02 MB. The total is checked against TEXTURE_MEMORY_BUDGET_BYTES in tests.
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
  | 'spineAtlas'
  | 'wallPanel'
  | 'rugWoven'
  | 'corkBoard'
  | 'lampGlow'

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
  const px = (m: number) => (m * w) / WALL_METRES_U
  const py = (m: number) => h - (m * h) / WALL_METRES_V
  const railY = py(WAINSCOT_HEIGHT)
  // Upper plaster.
  gradientRect(c, 0, 0, w, railY, 0, 0, 0, railY, [[0, '#686184'], [1, '#5e5878']])
  speckle(c, rnd, 0, 0, w, railY, 320, ['#716a8c', '#544e6c', '#5b5575'], 2, 0.35)
  // Faint stains, kept away from the tile edges so the texture repeats cleanly.
  for (let i = 0; i < 5; i++) {
    const x = 50 + rnd() * (w - 100)
    const y = 30 + rnd() * (railY - 120)
    const r = 14 + rnd() * 26
    disc(c, x, y, r, '#2e2842', 0.06)
    disc(c, x, y, r * 0.6, '#2e2842', 0.06)
    rect(c, x, y, 3, 40 + rnd() * 60, '#2e2842', 0.06)
  }
  // Picture rail and a few hairline cracks.
  rect(c, 0, py(2.25), w, 2, '#4c4664', 0.55)
  rect(c, 0, py(2.25) + 2, w, 1, '#7a7396', 0.35)
  for (let i = 0; i < 3; i++) {
    const x = 60 + rnd() * (w - 140)
    const y = 20 + rnd() * (railY - 100)
    line(c, x, y, x + 6 + rnd() * 8, y + 20 + rnd() * 30, '#3c3652', 1, 0.3)
  }
  // Wainscot base, panels, rails and stiles.
  rect(c, 0, railY, w, h - railY, '#4e4868')
  for (let i = 0; i < 2; i++) {
    const x0 = px(i * 1.25) + px(0.1)
    const pw = px(1.05)
    const top = py(0.93)
    const bottom = py(0.17)
    const ph = bottom - top
    rect(c, x0, top, pw, ph, '#575172')
    line(c, x0, top, x0 + pw, top, '#7a7396', 2, 0.9)
    line(c, x0, top, x0, bottom, '#7a7396', 2, 0.9)
    line(c, x0, bottom, x0 + pw, bottom, '#26223a', 2, 0.9)
    line(c, x0 + pw, top, x0 + pw, bottom, '#26223a', 2, 0.9)
    // Inner recessed field.
    rect(c, x0 + 12, top + 12, pw - 24, ph - 24, '#4a4463')
    line(c, x0 + 12, top + 12, x0 + pw - 12, top + 12, '#26223a', 2, 0.8)
    line(c, x0 + 12, top + 12, x0 + 12, bottom - 12, '#26223a', 2, 0.8)
    line(c, x0 + 12, bottom - 12, x0 + pw - 12, bottom - 12, '#7a7396', 1.5, 0.6)
    line(c, x0 + pw - 12, top + 12, x0 + pw - 12, bottom - 12, '#7a7396', 1.5, 0.6)
    speckle(c, rnd, x0 + 14, top + 14, pw - 28, ph - 28, 40, ['#3a3552', '#625b80'], 2, 0.3)
  }
  // Chair rail and skirting band.
  rect(c, 0, railY - 12, w, 12, '#706991')
  rect(c, 0, railY - 12, w, 2, '#8c85ab')
  rect(c, 0, railY, w, 3, '#26223a', 0.7)
  const baseY = py(0.14)
  rect(c, 0, baseY, w, h - baseY, '#38334e')
  rect(c, 0, baseY, w, 2, '#5a5478', 0.8)
  // Scuffs on the lower panels.
  for (let i = 0; i < 8; i++) {
    const x = 20 + rnd() * (w - 70)
    const y = py(0.7) + rnd() * (baseY - py(0.7) - 10)
    line(c, x, y, x + 10 + rnd() * 24, y + 1 + rnd() * 3, '#7f7899', 1, 0.22)
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
  spineAtlas: { id: 'spineAtlas', width: SPINE_ATLAS_WIDTH, height: SPINE_ATLAS_HEIGHT, filter: 'mipmap', wrap: 'clamp', seed: 114, draw: drawSpineAtlas },
  wallPanel: { id: 'wallPanel', width: 512, height: 512, filter: 'mipmap', wrap: 'repeat', seed: 115, draw: drawWallPanel },
  rugWoven: { id: 'rugWoven', width: 256, height: 256, filter: 'mipmap', wrap: 'clamp', seed: 116, draw: drawRugWoven },
  corkBoard: { id: 'corkBoard', width: 512, height: 512, filter: 'mipmap', wrap: 'clamp', seed: 117, draw: drawCorkBoard },
  lampGlow: { id: 'lampGlow', width: 64, height: 64, filter: 'mipmap', wrap: 'clamp', seed: 118, draw: drawLampGlow },
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
