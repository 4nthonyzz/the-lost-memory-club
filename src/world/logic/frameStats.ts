// Pure module: no imports from React, three.js or the DOM.
// Statistics helpers for the dev-only frame sampler. No thresholds live here.

export interface FrameSummary {
  frames: number;
  medianMs: number;
  p95Ms: number;
}

/** Keeps only finite, non-negative samples. */
export function cleanSamples(samples: readonly number[]): number[] {
  return samples.filter((s) => Number.isFinite(s) && s >= 0);
}

/** Nearest-rank percentile (p in 0..100) of a pre-sorted ascending array. NaN when empty. */
function percentileSorted(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const rank = Math.ceil((p / 100) * sorted.length);
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[index];
}

/** Median of the valid samples (mean of the two middle values for even counts). NaN when none. */
export function median(samples: readonly number[]): number {
  const sorted = cleanSamples(samples).sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return NaN;
  const mid = n >> 1;
  return n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** 95th percentile (nearest rank) of the valid samples. NaN when none. */
export function p95(samples: readonly number[]): number {
  return percentileSorted(cleanSamples(samples).sort((a, b) => a - b), 95);
}

/** Frame count, median and p95 of the valid samples. Statistics are NaN when no valid sample exists. */
export function summarize(samples: readonly number[]): FrameSummary {
  const sorted = cleanSamples(samples).sort((a, b) => a - b);
  const n = sorted.length;
  const mid = n >> 1;
  const medianMs = n === 0 ? NaN : n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { frames: n, medianMs, p95Ms: percentileSorted(sorted, 95) };
}

/** Fixed-capacity ring buffer of numbers. Oldest samples are overwritten once full. */
export interface RingBuffer {
  readonly capacity: number;
  /** Number of stored samples (at most capacity). */
  readonly size: number;
  push(value: number): void;
  clear(): void;
  /** Stored samples, oldest first. Allocates a new array. */
  toArray(): number[];
}

export function createRingBuffer(capacity: number): RingBuffer {
  const cap = Math.max(1, Math.floor(capacity));
  const data = new Float64Array(cap);
  let next = 0;
  let count = 0;
  return {
    capacity: cap,
    get size() {
      return count;
    },
    push(value: number) {
      data[next] = value;
      next = (next + 1) % cap;
      if (count < cap) count++;
    },
    clear() {
      next = 0;
      count = 0;
    },
    toArray() {
      const out: number[] = new Array<number>(count);
      const start = count < cap ? 0 : next;
      for (let i = 0; i < count; i++) out[i] = data[(start + i) % cap];
      return out;
    },
  };
}
