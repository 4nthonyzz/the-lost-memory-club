// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readReducedMotion, useReducedMotion } from './useReducedMotion';

type Listener = (event: { matches: boolean }) => void;

function mockMatchMedia(initial: boolean, legacy = false) {
  const listeners = new Set<Listener>();
  const mql: Record<string, unknown> = { matches: initial };
  const add = vi.fn((...args: unknown[]) => {
    listeners.add(args[args.length - 1] as Listener);
  });
  const remove = vi.fn((...args: unknown[]) => {
    listeners.delete(args[args.length - 1] as Listener);
  });
  if (legacy) {
    mql.addListener = add;
    mql.removeListener = remove;
  } else {
    mql.addEventListener = add;
    mql.removeEventListener = remove;
  }
  window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;
  return {
    add,
    remove,
    listeners,
    emit(matches: boolean) {
      mql.matches = matches;
      listeners.forEach((l) => l({ matches }));
    },
  };
}

const original = window.matchMedia;
afterEach(() => {
  window.matchMedia = original;
});

describe('readReducedMotion', () => {
  it('reads matches and tolerates a missing matchMedia', () => {
    expect(readReducedMotion({ matchMedia: () => ({ matches: true }) })).toBe(true);
    expect(readReducedMotion({ matchMedia: () => ({ matches: false }) })).toBe(false);
    expect(readReducedMotion({})).toBe(false);
    expect(readReducedMotion(undefined)).toBe(false);
  });
});

describe('useReducedMotion', () => {
  it('returns the initial preference', () => {
    mockMatchMedia(true);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true);
    mockMatchMedia(false);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
  });

  it('updates on change without remounting', () => {
    const mm = mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    act(() => mm.emit(true));
    expect(result.current).toBe(true);
    act(() => mm.emit(false));
    expect(result.current).toBe(false);
  });

  it('supports legacy addListener/removeListener', () => {
    const mm = mockMatchMedia(false, true);
    const { result, unmount } = renderHook(() => useReducedMotion());
    act(() => mm.emit(true));
    expect(result.current).toBe(true);
    unmount();
    expect(mm.listeners.size).toBe(0);
  });

  it('ORs the override and applies changes without remount', () => {
    mockMatchMedia(false);
    const { result, rerender } = renderHook(({ o }) => useReducedMotion(o), {
      initialProps: { o: false },
    });
    expect(result.current).toBe(false);
    rerender({ o: true });
    expect(result.current).toBe(true);
    rerender({ o: false });
    expect(result.current).toBe(false);
  });

  it('override stays true when the preference is true', () => {
    mockMatchMedia(true);
    expect(renderHook(() => useReducedMotion(true)).result.current).toBe(true);
  });

  it('treats a missing matchMedia as no preference', () => {
    (window as unknown as { matchMedia?: unknown }).matchMedia = undefined;
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
    expect(renderHook(() => useReducedMotion(true)).result.current).toBe(true);
  });

  it('removes the listener on unmount', () => {
    const mm = mockMatchMedia(false);
    const { unmount } = renderHook(() => useReducedMotion());
    expect(mm.listeners.size).toBe(1);
    unmount();
    expect(mm.remove).toHaveBeenCalledTimes(1);
    expect(mm.listeners.size).toBe(0);
  });
});
