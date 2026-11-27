import { describe, expect, it } from 'vitest'
import { countDirectionChanges } from '../logic/palette'
import {
  DUST_COUNT,
  NOISE_MAX_HZ,
  flickeredIntensity,
  glowFactor,
  initDust,
  shouldUpdateNoise,
  stepDust,
  type DustBounds,
} from './effectsTiming'

import {
  MAZE_PING_PERIOD_SEC,
  SNAKE_FRAGMENT_SPACING,
  SNAKE_STEP_SEC,
  attractPulseLevel,
  frequencyLockLevel,
  mazePhotoPulse,
  mazePingLevel,
} from './proceduralTextures'
import { ATTRACT_MAX_HZ, INITIAL_ATTRACT_CLOCK, stepAttractClock, type AttractClock } from './effectsTiming'

describe('task 29.2: attract screen clock and pulse', () => {
  function run(fps: number, seconds: number, active: boolean, reduced: boolean, start: AttractClock = INITIAL_ATTRACT_CLOCK) {
    let clock = start
    const redrawTimes: number[] = []
    for (let i = 0; i < fps * seconds; i++) {
      const r = stepAttractClock(clock, 1 / fps, active, reduced)
      clock = r.clock
      if (r.redraw) redrawTimes.push(i / fps)
    }
    return { clock, redrawTimes }
  }

  it.each([60, 144])('redraws at most 24 and at least 20 times in every rolling second at %i fps', (fps) => {
    const { redrawTimes } = run(fps, 10, true, false)
    expect(ATTRACT_MAX_HZ).toBe(24)
    expect(NOISE_MAX_HZ).toBe(12) // the CRT overlay noise keeps its own 12 Hz constant
    for (let i = 0; i < fps * 9; i++) {
      const start = i / fps
      const n = redrawTimes.filter((t) => t >= start - 1e-9 && t < start + 1 - 1e-6).length
      expect(n, `window at ${start}`).toBeLessThanOrEqual(24)
      expect(n, `window at ${start}`).toBeGreaterThanOrEqual(20)
    }
  })

  it('reduced motion never redraws from the initial static frame and keeps the clock at 0', () => {
    const r = run(60, 5, true, true)
    expect(r.redrawTimes.length).toBe(0)
    expect(r.clock.elapsed).toBe(0)
  })

  it('reduced motion turning on mid-run redraws once at elapsed 0, then stays still', () => {
    const running = run(60, 2, true, false).clock
    expect(running.elapsed).toBeGreaterThan(1.9)
    expect(running.staticShown).toBe(false)
    const r = run(60, 3, true, true, running)
    expect(r.redrawTimes).toEqual([0])
    expect(r.clock).toEqual({ elapsed: 0, accumulator: 0, staticShown: true })
  })

  it('inactive: no redraw and the clock does not advance, and it resumes where it stopped', () => {
    const running = run(60, 1, true, false).clock
    const paused = run(60, 4, false, false, running)
    expect(paused.redrawTimes.length).toBe(0)
    expect(paused.clock).toEqual(running)
    const resumed = run(60, 1, true, false, paused.clock)
    expect(resumed.clock.elapsed).toBeCloseTo(running.elapsed + 1, 5)
  })

  // Photosensitivity (task 30.3): every animated brightness component, sampled at 240 Hz for 40 s.
  const COMPONENTS: Record<string, (t: number) => number> = {
    'snake collection pulse': attractPulseLevel,
    'maze radar ping': mazePingLevel,
    'maze photo shimmer 0': (t) => mazePhotoPulse(t, 0),
    'maze photo shimmer 1': (t) => mazePhotoPulse(t, 1),
    'maze photo shimmer 2': (t) => mazePhotoPulse(t, 2),
    'frequency lock pulse': frequencyLockLevel,
  }
  it.each(Object.keys(COMPONENTS))('%s changes direction at most 3 times in every rolling second', (name) => {
    const rate = 240
    const fn = COMPONENTS[name]
    const samples = Array.from({ length: rate * 40 }, (_, i) => fn(i / rate))
    expect(Math.max(...samples), name).toBeGreaterThan(0.99)
    for (let start = 0; start + rate <= samples.length; start += 6) {
      expect(countDirectionChanges(samples.slice(start, start + rate + 1)), `${name} window at ${start / rate}s`).toBeLessThanOrEqual(3)
    }
  })

  it('snake collections are at least 1.5 s apart, so pulses are at most one per 1.5 s', () => {
    expect(SNAKE_STEP_SEC * SNAKE_FRAGMENT_SPACING).toBeGreaterThanOrEqual(1.5)
    expect(MAZE_PING_PERIOD_SEC).toBeGreaterThanOrEqual(1)
  })
})

function countUpdates(fps: number, seconds: number, reduced = false): number {
  const dt = 1 / fps
  let acc = 0
  let count = 0
  for (let i = 0; i < fps * seconds; i++) {
    const r = shouldUpdateNoise(acc, dt, NOISE_MAX_HZ, reduced)
    acc = r.accumulator
    if (r.update) count++
  }
  return count
}

describe('shouldUpdateNoise', () => {
  it('updates at most 12 times per second at 60 fps and 144 fps', () => {
    expect(countUpdates(60, 10)).toBeLessThanOrEqual(NOISE_MAX_HZ * 10)
    expect(countUpdates(144, 10)).toBeLessThanOrEqual(NOISE_MAX_HZ * 10)
    expect(countUpdates(60, 10)).toBeGreaterThan(NOISE_MAX_HZ * 10 * 0.8)
  })
  it('never updates under reduced motion', () => {
    expect(countUpdates(60, 5, true)).toBe(0)
  })
  it('ignores invalid dt', () => {
    expect(shouldUpdateNoise(0, NaN, 12).update).toBe(false)
  })
})

describe('dust', () => {
  const bounds: DustBounds = { minX: -4, maxX: 4, minY: 0.3, maxY: 2.7, minZ: -3, maxZ: 3 }
  it('stays within bounds while drifting', () => {
    const p = new Float32Array(DUST_COUNT * 3)
    const v = new Float32Array(DUST_COUNT * 3)
    initDust(p, v, bounds)
    for (let i = 0; i < 6000; i++) stepDust(p, v, 1 / 60, bounds)
    for (let i = 0; i < DUST_COUNT; i++) {
      expect(p[i * 3]).toBeGreaterThanOrEqual(bounds.minX)
      expect(p[i * 3]).toBeLessThanOrEqual(bounds.maxX)
      expect(p[i * 3 + 1]).toBeGreaterThanOrEqual(bounds.minY)
      expect(p[i * 3 + 1]).toBeLessThanOrEqual(bounds.maxY)
      expect(p[i * 3 + 2]).toBeGreaterThanOrEqual(bounds.minZ)
      expect(p[i * 3 + 2]).toBeLessThanOrEqual(bounds.maxZ)
    }
  })
  it('does not move under reduced motion', () => {
    const p = new Float32Array(30)
    const v = new Float32Array(30)
    initDust(p, v, bounds)
    const before = Array.from(p)
    stepDust(p, v, 1, bounds, true)
    expect(Array.from(p)).toEqual(before)
  })
})

describe('combined light and glow', () => {
  it('keeps CRT intensity within 15 percent and at most 3 direction changes per second', () => {
    const base = 6
    const samples: number[] = []
    for (let i = 0; i <= 5000; i++) samples.push(flickeredIntensity(base, i * 0.002, false))
    for (const s of samples) {
      expect(s).toBeGreaterThanOrEqual(base * 0.85)
      expect(s).toBeLessThanOrEqual(base * 1.15)
    }
    // 10 seconds sampled at 500 Hz: the whole run has at most 3 changes per second.
    expect(countDirectionChanges(samples)).toBeLessThanOrEqual(30)
  }, 30000)
  it('is constant under reduced motion', () => {
    for (let i = 0; i < 50; i++) {
      expect(flickeredIntensity(6, i * 0.3, true)).toBe(6)
      expect(glowFactor(i * 0.3, true)).toBe(1)
    }
  })
  it('glow varies at 0.5 Hz', () => {
    // Period is 2 s: peak at 0.5 s, back to 1 at 1 s and 2 s, trough at 1.5 s.
    expect(glowFactor(0.5, false)).toBeCloseTo(1.25, 5)
    expect(glowFactor(1, false)).toBeCloseTo(1, 5)
    expect(glowFactor(1.5, false)).toBeCloseTo(0.75, 5)
    expect(glowFactor(2, false)).toBeCloseTo(1, 5)
  })
})
