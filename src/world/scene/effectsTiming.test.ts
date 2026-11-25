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
