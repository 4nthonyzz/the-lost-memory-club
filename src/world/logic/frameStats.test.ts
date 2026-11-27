import { describe, expect, it } from 'vitest';
import { createRingBuffer, median, p95, summarize } from './frameStats';

describe('frameStats', () => {
  it('computes median and p95 for typical samples', () => {
    const samples = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
    expect(median(samples)).toBe(50.5);
    expect(p95(samples)).toBe(95);
    expect(median([3, 1, 2])).toBe(2);
    expect(summarize(samples)).toEqual({ frames: 100, medianMs: 50.5, p95Ms: 95 });
  });

  it('returns NaN statistics and zero frames when empty', () => {
    const s = summarize([]);
    expect(s.frames).toBe(0);
    expect(s.medianMs).toBeNaN();
    expect(s.p95Ms).toBeNaN();
  });

  it('filters NaN, infinite and negative samples without mutating the input', () => {
    const input = [NaN, 10, -5, Infinity, 20, 30];
    const s = summarize(input);
    expect(s).toEqual({ frames: 3, medianMs: 20, p95Ms: 30 });
    expect(input).toEqual([NaN, 10, -5, Infinity, 20, 30]);
    expect(summarize([NaN, -1]).frames).toBe(0);
  });

  it('handles a single sample', () => {
    expect(summarize([16.7])).toEqual({ frames: 1, medianMs: 16.7, p95Ms: 16.7 });
  });

  it('ring buffer keeps the newest samples, oldest first, after wrapping', () => {
    const rb = createRingBuffer(3);
    expect(rb.toArray()).toEqual([]);
    rb.push(1);
    rb.push(2);
    expect(rb.toArray()).toEqual([1, 2]);
    rb.push(3);
    rb.push(4);
    rb.push(5);
    expect(rb.size).toBe(3);
    expect(rb.toArray()).toEqual([3, 4, 5]);
    rb.clear();
    expect(rb.size).toBe(0);
    expect(rb.toArray()).toEqual([]);
    rb.push(9);
    expect(rb.toArray()).toEqual([9]);
  });
});
