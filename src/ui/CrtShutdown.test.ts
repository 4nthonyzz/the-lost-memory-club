// @vitest-environment jsdom
import { createElement } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CrtShutdown, SHUTDOWN_MS, SHUTDOWN_PHASES, SHUTDOWN_REDUCED_MS } from './CrtShutdown';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('CrtShutdown timing', () => {
  it('calls onDone once, after the full 1.2 s animation', () => {
    const onDone = vi.fn();
    render(createElement(CrtShutdown, { onDone }));
    act(() => {
      vi.advanceTimersByTime(SHUTDOWN_MS - 1);
    });
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('shortens the sequence under reduced distortion', () => {
    const onDone = vi.fn();
    render(createElement(CrtShutdown, { onDone, reducedDistortion: true }));
    act(() => {
      vi.advanceTimersByTime(SHUTDOWN_REDUCED_MS);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('does not restart the timer when the parent passes a new callback', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(createElement(CrtShutdown, { onDone: first }));
    act(() => {
      vi.advanceTimersByTime(800);
    });
    rerender(createElement(CrtShutdown, { onDone: second }));
    act(() => {
      vi.advanceTimersByTime(SHUTDOWN_MS - 800);
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('CrtShutdown phases', () => {
  it('renders the five layers of the four phases', () => {
    render(createElement(CrtShutdown, { onDone: () => undefined }));
    for (const layer of ['flash', 'picture', 'line', 'dot', 'dim']) {
      expect(document.querySelector(`.crt-shutdown__${layer}`)).not.toBeNull();
    }
  });

  it('runs the four phases back to back, ending at the full 1.2 s', () => {
    expect(SHUTDOWN_PHASES.map((phase) => phase.name)).toEqual(['flash', 'vertical-collapse', 'horizontal-collapse', 'fade']);
    SHUTDOWN_PHASES.forEach((phase, index) => {
      expect(phase.end).toBeGreaterThan(phase.start);
      if (index > 0) expect(phase.start).toBe(SHUTDOWN_PHASES[index - 1]!.end);
    });
    expect(Math.round(SHUTDOWN_PHASES[SHUTDOWN_PHASES.length - 1]!.end * 1000)).toBe(SHUTDOWN_MS);
  });
});
