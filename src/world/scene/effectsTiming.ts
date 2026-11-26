/**
 * Pure helpers for the environmental effects (M4). No three.js, React or DOM imports,
 * so throttling, drift and flicker limits can be tested in node.
 */
import { MAX_DT_SEC, flickerFactor } from '../logic/palette'

/** Static noise refresh cap (updates per second). */
export const NOISE_MAX_HZ = 12
/** Screen glow variation frequency in Hz. */
export const GLOW_HZ = 0.5
/** Glow peak deviation from 1.0 (small). */
export const GLOW_AMPLITUDE = 0.25
export const DUST_COUNT = 150
/** Dust drift speed cap in meters per second. */
export const DUST_MAX_SPEED = 0.06

export interface NoiseStep {
  update: boolean
  accumulator: number
}

/**
 * Throttle accumulator. Returns update=true at most `maxHz` times per second of accumulated time.
 * Reduced motion never updates and keeps the accumulator at 0.
 */
export function shouldUpdateNoise(
  accumulator: number,
  dt: number,
  maxHz: number,
  reducedMotion = false,
): NoiseStep {
  if (reducedMotion || !(maxHz > 0)) return { update: false, accumulator: 0 }
  const step = Number.isFinite(dt) && dt > 0 ? Math.min(dt, MAX_DT_SEC) : 0
  const interval = 1 / maxHz
  const acc = (Number.isFinite(accumulator) && accumulator > 0 ? accumulator : 0) + step
  if (acc < interval) return { update: false, accumulator: acc }
  return { update: true, accumulator: acc % interval }
}

/**
 * Attract screen redraw cap (updates per second). Task 30.3: raised from 12 Hz to 24 Hz. It is a separate constant from
 * NOISE_MAX_HZ, so the CRT overlay static noise stays at 12 Hz.
 */
export const ATTRACT_MAX_HZ = 24

export interface AttractClock {
  /** Animation clock in seconds. It only advances while the effects are active and motion is allowed. */
  elapsed: number
  /** Throttle accumulator in seconds. */
  accumulator: number
  /** True while the canvases show the elapsed = 0 static frame. */
  staticShown: boolean
}

export const INITIAL_ATTRACT_CLOCK: AttractClock = Object.freeze({ elapsed: 0, accumulator: 0, staticShown: true })

export interface AttractStep {
  clock: AttractClock
  /** True when the three attract canvases must be redrawn at `clock.elapsed`. */
  redraw: boolean
}

/**
 * Attract screen clock and throttle (task 29.2). Inactive (inspecting): nothing changes, so the animation resumes where it
 * stopped. Reduced motion: the clock returns to 0 and the screens are redrawn once at the static frame, then never again.
 * Otherwise the clock advances by the capped frame step and a redraw is requested at most ATTRACT_MAX_HZ times per second.
 */
export function stepAttractClock(clock: AttractClock, dt: number, active: boolean, reducedMotion: boolean): AttractStep {
  if (!active) return { clock, redraw: false }
  if (reducedMotion) {
    if (clock.staticShown) return { clock, redraw: false }
    return { clock: { elapsed: 0, accumulator: 0, staticShown: true }, redraw: true }
  }
  const step = Number.isFinite(dt) && dt > 0 ? Math.min(dt, MAX_DT_SEC) : 0
  const elapsed = clock.elapsed + step
  const throttle = shouldUpdateNoise(clock.accumulator, step, ATTRACT_MAX_HZ, false)
  return {
    clock: { elapsed, accumulator: throttle.accumulator, staticShown: throttle.update ? false : clock.staticShown },
    redraw: throttle.update,
  }
}

/** Multiplier on the screen glow overlay opacity: 0.5 Hz, constant 1 under reduced motion. */
export function glowFactor(timeSec: number, reducedMotion: boolean): number {
  if (reducedMotion || !Number.isFinite(timeSec)) return 1
  return 1 + GLOW_AMPLITUDE * Math.sin(2 * Math.PI * GLOW_HZ * timeSec)
}

/** CRT light intensity: the base set by the Memory_Shift driver times the flicker factor. */
export function flickeredIntensity(baseIntensity: number, timeSec: number, reducedMotion: boolean): number {
  return baseIntensity * flickerFactor(timeSec, reducedMotion)
}

export interface DustBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

/** Small deterministic PRNG (mulberry32) so dust layout is reproducible. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fills positions (x,y,z triples) uniformly inside bounds and velocities within DUST_MAX_SPEED. */
export function initDust(positions: Float32Array, velocities: Float32Array, bounds: DustBounds, seed = 1337): void {
  const rnd = makeRng(seed)
  const n = Math.floor(positions.length / 3)
  for (let i = 0; i < n; i++) {
    positions[i * 3] = bounds.minX + rnd() * (bounds.maxX - bounds.minX)
    positions[i * 3 + 1] = bounds.minY + rnd() * (bounds.maxY - bounds.minY)
    positions[i * 3 + 2] = bounds.minZ + rnd() * (bounds.maxZ - bounds.minZ)
    velocities[i * 3] = (rnd() * 2 - 1) * DUST_MAX_SPEED
    velocities[i * 3 + 1] = (rnd() * 2 - 1) * DUST_MAX_SPEED * 0.5
    velocities[i * 3 + 2] = (rnd() * 2 - 1) * DUST_MAX_SPEED
  }
}

function wrap(v: number, lo: number, hi: number): number {
  const range = hi - lo
  if (!(range > 0)) return lo
  if (v < lo) return Math.min(hi, v + range)
  if (v > hi) return Math.max(lo, v - range)
  return v
}

/** Advances dust in place and wraps it inside bounds. No allocation. Reduced motion leaves it still. */
export function stepDust(
  positions: Float32Array,
  velocities: Float32Array,
  dt: number,
  bounds: DustBounds,
  reducedMotion = false,
): void {
  if (reducedMotion || !Number.isFinite(dt) || dt <= 0) return
  const step = Math.min(dt, MAX_DT_SEC)
  const n = Math.floor(positions.length / 3)
  for (let i = 0; i < n; i++) {
    const k = i * 3
    positions[k] = wrap(positions[k] + velocities[k] * step, bounds.minX, bounds.maxX)
    positions[k + 1] = wrap(positions[k + 1] + velocities[k + 1] * step, bounds.minY, bounds.maxY)
    positions[k + 2] = wrap(positions[k + 2] + velocities[k + 2] * step, bounds.minZ, bounds.maxZ)
  }
}

/** Fills RGBA bytes with gray noise, in place. */
export function fillNoise(data: Uint8ClampedArray, rnd: () => number): void {
  for (let i = 0; i < data.length; i += 4) {
    const v = (rnd() * 255) | 0
    data[i] = v
    data[i + 1] = v
    data[i + 2] = v
    data[i + 3] = 255
  }
}
