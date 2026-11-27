// Palette module (M1 + M4). Pure: hex strings and numbers only, no three.js, React or DOM.
// The palette is derived only from the memoryShifted boolean; the transition progress
// and flicker are pure functions of time so the scene layer can sample them per frame.

export interface Palette {
  /** Scene background color, hex string. */
  background: string
  /** Ambient light color, hex string. */
  ambient: string
  /** Ambient light intensity, never below AMBIENT_INTENSITY_FLOOR. */
  ambientIntensity: number
  /** Directional/point light color, hex string. */
  lightColor: string
  /** Fog color, hex string. */
  fogColor: string
  /** Fog near distance (linear fog). */
  fogNear: number
  /** Fog far distance (linear fog). */
  fogFar: number
  /** Fog density (exponential fog). */
  fogDensity: number
  /** Wall tint, hex string. */
  wallTint: string
  /** Screen emissive color, hex string. */
  screenEmissive: string
  /** Screen emissive intensity. */
  screenEmissiveIntensity: number
  /** Accent color, hex string. */
  accent: string
}

/** Minimum ambient intensity so floor, walls and Stations stay readable (Req 10.7). */
export const AMBIENT_INTENSITY_FLOOR = 0.35

/** Duration of the normal-to-shifted transition in seconds (Req 9.4). */
export const TRANSITION_DURATION_SEC = 2
/** The transition is complete no later than this many seconds after the trigger (Req 9.4, 9.5). */
export const TRANSITION_MAX_SEC = 3
/** Largest frame step accepted by advanceProgress, in seconds. */
export const MAX_DT_SEC = 0.25

/** Flicker: peak deviation from 1.0 (12 percent, under the 15 percent limit). */
export const FLICKER_AMPLITUDE = 0.12
/** Flicker frequency in Hz. A sine has 2 direction changes per cycle: 2.8 per second, at most 3. */
export const FLICKER_HZ = 1.4

export const PALETTE_NORMAL: Palette = {
  background: '#0b1230',
  ambient: '#6f8fd8',
  // Task 26.2: mid-tone balance. 0.54 with both desk lamps ON (factor 1.0); 1 lamp gives 0.513, 0 lamps 0.486.
  ambientIntensity: 0.54,
  lightColor: '#a9bdf0',
  fogColor: '#0b1230',
  fogNear: 6,
  fogFar: 22,
  fogDensity: 0.02,
  wallTint: '#2a3358',
  screenEmissive: '#4aa8ff',
  screenEmissiveIntensity: 0.8,
  accent: '#7fd6ff',
}

export const PALETTE_SHIFTED: Palette = {
  background: '#2a0a14',
  ambient: '#d86f86',
  // Task 26.2: lowered from 0.55 so the shifted room stays slightly dimmer than the normal one (0.54).
  ambientIntensity: 0.5,
  lightColor: '#f0a9b6',
  fogColor: '#2a0a14',
  fogNear: 4,
  fogFar: 16,
  fogDensity: 0.04,
  wallTint: '#58202f',
  screenEmissive: '#ff4a6a',
  screenEmissiveIntensity: 1.1,
  accent: '#ff7f9a',
}

export function paletteFor(memoryShifted: boolean): Palette {
  return memoryShifted ? PALETTE_SHIFTED : PALETTE_NORMAL
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}

function clamp01(value: number): number {
  const v = finiteOr(value, 0)
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/**
 * Transition progress in [0, 1] after `elapsedSec` seconds (linear over 2 s).
 * Reduced motion completes immediately. NaN or negative elapsed gives 0.
 */
export function transitionProgress(elapsedSec: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1
  if (!Number.isFinite(elapsedSec) || elapsedSec <= 0) return 0
  return clamp01(elapsedSec / TRANSITION_DURATION_SEC)
}

/**
 * Advance a stored progress value toward `target` (1 = shifted, 0 = normal).
 * Works in both directions so a true -> false change restores the original look.
 * Invalid or negative dt counts as 0; dt is capped at MAX_DT_SEC.
 */
export function advanceProgress(
  t: number,
  dt: number,
  target: 0 | 1,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return target
  const current = clamp01(t)
  const step = Math.min(Math.max(finiteOr(dt, 0), 0), MAX_DT_SEC) / TRANSITION_DURATION_SEC
  if (target === 1) return Math.min(1, current + step)
  return Math.max(0, current - step)
}

function parseHex(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return [0, 0, 0]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex(r: number, g: number, b: number): string {
  const part = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpHex(a: string, b: string, t: number): string {
  const ca = parseHex(a)
  const cb = parseHex(b)
  return toHex(lerp(ca[0], cb[0], t), lerp(ca[1], cb[1], t), lerp(ca[2], cb[2], t))
}

/** Blend two palettes (sRGB hex lerp, numeric lerp). t is clamped; ambient floor is always kept. */
export function blendPalette(a: Palette, b: Palette, t: number): Palette {
  const k = clamp01(t)
  return {
    background: lerpHex(a.background, b.background, k),
    ambient: lerpHex(a.ambient, b.ambient, k),
    ambientIntensity: Math.max(
      AMBIENT_INTENSITY_FLOOR,
      lerp(a.ambientIntensity, b.ambientIntensity, k),
    ),
    lightColor: lerpHex(a.lightColor, b.lightColor, k),
    fogColor: lerpHex(a.fogColor, b.fogColor, k),
    fogNear: lerp(a.fogNear, b.fogNear, k),
    fogFar: lerp(a.fogFar, b.fogFar, k),
    fogDensity: lerp(a.fogDensity, b.fogDensity, k),
    wallTint: lerpHex(a.wallTint, b.wallTint, k),
    screenEmissive: lerpHex(a.screenEmissive, b.screenEmissive, k),
    screenEmissiveIntensity: lerp(a.screenEmissiveIntensity, b.screenEmissiveIntensity, k),
    accent: lerpHex(a.accent, b.accent, k),
  }
}

/**
 * Light flicker multiplier around 1.0. Deviation is at most FLICKER_AMPLITUDE (under 15 percent)
 * and the direction changes at most 3 times per second. Constant 1 under reduced motion.
 */
export function flickerFactor(timeSec: number, reducedMotion: boolean): number {
  if (reducedMotion || !Number.isFinite(timeSec)) return 1
  return 1 + FLICKER_AMPLITUDE * Math.sin(2 * Math.PI * FLICKER_HZ * timeSec)
}

/** Count direction changes (local extrema) in a sampled sequence. Flat runs are ignored. */
export function countDirectionChanges(values: readonly number[]): number {
  let changes = 0
  let lastSign = 0
  for (let i = 1; i < values.length; i++) {
    const d = values[i] - values[i - 1]
    const sign = d > 0 ? 1 : d < 0 ? -1 : 0
    if (sign === 0) continue
    if (lastSign !== 0 && sign !== lastSign) changes++
    lastSign = sign
  }
  return changes
}
