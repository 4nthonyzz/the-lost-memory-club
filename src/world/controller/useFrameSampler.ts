import { createElement, useEffect, useMemo, type ReactElement } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { createRingBuffer, summarize } from '../logic/frameStats';

/**
 * Dev-only frame sampler (Requirements 7.9, 14.8, 14.9, 14.11).
 * Records frame deltas and renderer.info numbers. It reports raw measurements
 * only: no thresholds, no pass/fail claims, no logging.
 */

export const FRAME_SAMPLE_CAPACITY = 3600;

export interface WorldPerfSummary {
  frames: number;
  medianMs: number;
  p95Ms: number;
  triangles: number;
  drawCalls: number;
  geometries: number;
  textures: number;
}

export interface WorldPerfApi {
  summary(): WorldPerfSummary;
  reset(): void;
}

declare global {
  interface Window {
    __WORLD_PERF__?: boolean;
    __worldPerf?: WorldPerfApi;
  }
}

/** True only in a dev build with `?worldPerf=1` in the URL or `window.__WORLD_PERF__ === true`. */
export function isFrameSamplerEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === 'undefined') return false;
  if (window.__WORLD_PERF__ === true) return true;
  try {
    return new URLSearchParams(window.location.search).get('worldPerf') === '1';
  } catch {
    return false;
  }
}

/** Active sampler. Mount only when enabled; see FrameSamplerHost. */
export function useFrameSampler(enabled: boolean): void {
  // Disabled: return before any hook subscribes anything. `enabled` is fixed per mount by the host.
  if (!enabled) return;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useActiveSampler();
}

function useActiveSampler(): void {
  const info = useThree((s) => s.gl.info);
  const buffer = useMemo(() => createRingBuffer(FRAME_SAMPLE_CAPACITY), []);

  useFrame((_state, delta) => {
    buffer.push(delta * 1000);
  });

  useEffect(() => {
    const api: WorldPerfApi = {
      summary() {
        const stats = summarize(buffer.toArray());
        return {
          ...stats,
          triangles: info.render.triangles,
          drawCalls: info.render.calls,
          geometries: info.memory.geometries,
          textures: info.memory.textures,
        };
      },
      reset() {
        buffer.clear();
      },
    };
    window.__worldPerf = api;
    return () => {
      if (window.__worldPerf === api) delete window.__worldPerf;
    };
  }, [buffer, info]);
}

function ActiveFrameSampler(): null {
  useFrameSampler(true);
  return null;
}

/** Renders null. When the sampler is disabled nothing subscribes, listens or allocates. */
export function FrameSamplerHost(): ReactElement | null {
  return isFrameSamplerEnabled() ? createElement(ActiveFrameSampler) : null;
}
