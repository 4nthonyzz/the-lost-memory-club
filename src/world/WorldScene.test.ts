// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

// The target source is controllable. usePlayerRig is mocked so no R3F frame loop is needed.
const h = vi.hoisted(() => ({ target: null as 'vhs' | 'arcade' | null }));

vi.mock('./scene/WorldCanvas', () => ({
  WorldCanvas: ({ children }: { children?: ReactNode }) =>
    createElement('div', { 'data-testid': 'canvas' }, children),
}));
vi.mock('./controller/useFrameSampler', () => ({ FrameSamplerHost: () => null }));
vi.mock('./scene/Lighting', () => ({ Lighting: () => null }));
vi.mock('./scene/Effects', () => ({ Effects: () => null }));
vi.mock('./scene/Props', () => ({ Props: () => null }));
vi.mock('./scene/Room', () => ({ Room: () => null }));
vi.mock('./scene/Stations', () => ({ Stations: () => null }));
vi.mock('@react-three/fiber', () => {
  const gl = { domElement: document.createElement('canvas') };
  return { useThree: (sel: (s: unknown) => unknown) => sel({ gl }) };
});
vi.mock('./controller/usePlayerRig', async () => {
  const { useEffect } = await import('react');
  return {
    usePlayerRig: (opts: { onTargetChange: (t: 'vhs' | 'arcade' | null) => void }) => {
      useEffect(() => {
        opts.onTargetChange(h.target);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return { getTarget: () => h.target };
    },
  };
});

import { WorldScene } from './WorldScene';

const originalGetContext = HTMLCanvasElement.prototype.getContext;
const lockSpy = vi.fn();

function setWebgl(available: boolean) {
  HTMLCanvasElement.prototype.getContext = (() => (available ? {} : null)) as never;
}

beforeEach(() => {
  h.target = null;
  lockSpy.mockReset();
  HTMLElement.prototype.requestPointerLock = lockSpy as never;
  setWebgl(true);
});

afterEach(() => {
  cleanup();
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  vi.restoreAllMocks();
});

function renderWorld(onInspect = vi.fn()) {
  const utils = render(createElement(WorldScene, { onInspect, memoryShifted: false }));
  const wrapper = document.querySelector('.world-wrapper') as HTMLElement;
  return { ...utils, wrapper, onInspect };
}

describe('WorldScene input (jsdom)', () => {
  it('E with a target calls onInspect with that station', () => {
    h.target = 'arcade';
    const { wrapper, onInspect } = renderWorld();
    fireEvent.keyDown(wrapper, { code: 'KeyE', key: 'e' });
    expect(onInspect).toHaveBeenCalledTimes(1);
    expect(onInspect).toHaveBeenCalledWith('arcade');
  });

  it('E without a target does not call onInspect', () => {
    const { wrapper, onInspect } = renderWorld();
    fireEvent.keyDown(wrapper, { code: 'KeyE', key: 'e' });
    expect(onInspect).not.toHaveBeenCalled();
  });

  it('shows the exact prompt strings', () => {
    h.target = 'vhs';
    const a = renderWorld();
    expect(screen.getByText('Press E to inspect the CRT television')).toBeTruthy();
    a.unmount();
    h.target = 'arcade';
    renderWorld();
    expect(screen.getByText('Press E to use the arcade cabinet')).toBeTruthy();
  });

  it('ignores key events from an input and a button outside the wrapper', () => {
    h.target = 'vhs';
    const { onInspect } = renderWorld();
    const input = document.createElement('input');
    const button = document.createElement('button');
    document.body.append(input, button);
    fireEvent.keyDown(input, { code: 'KeyE', key: 'e' });
    fireEvent.keyDown(button, { code: 'KeyE', key: 'e' });
    fireEvent.keyDown(document.body, { code: 'KeyE', key: 'e' });
    expect(onInspect).not.toHaveBeenCalled();
    expect(lockSpy).not.toHaveBeenCalled();
    input.remove();
    button.remove();
  });

  it('requests pointer lock only after a click', () => {
    const { wrapper } = renderWorld();
    expect(lockSpy).not.toHaveBeenCalled();
    wrapper.focus();
    fireEvent.focus(wrapper);
    expect(lockSpy).not.toHaveBeenCalled();
    fireEvent.click(wrapper);
    expect(lockSpy).toHaveBeenCalledTimes(1);
  });

  it('removes every listener useWorldInput adds on unmount', () => {
    type Rec = { target: EventTarget; type: string; listener: unknown };
    const added: Rec[] = [];
    const removed: Rec[] = [];
    const proto = EventTarget.prototype;
    const origAdd = proto.addEventListener;
    const origRemove = proto.removeEventListener;
    // Wrapper, window and document only. React's own root/document listeners are excluded.
    const watched = (t: EventTarget) =>
      t === window ||
      t === document ||
      (t instanceof HTMLElement && t.classList.contains('world-wrapper'));
    proto.addEventListener = function (this: EventTarget, type: string, listener: never, o?: never) {
      if (watched(this) && type !== 'selectionchange') added.push({ target: this, type, listener });
      return origAdd.call(this, type, listener, o);
    } as never;
    proto.removeEventListener = function (this: EventTarget, type: string, listener: never, o?: never) {
      if (watched(this)) removed.push({ target: this, type, listener });
      return origRemove.call(this, type, listener, o);
    } as never;
    try {
      const { unmount } = renderWorld();
      const worldAdds = added.filter((r) => r.target !== document || r.type !== 'selectionchange');
      expect(worldAdds.length).toBeGreaterThan(0);
      unmount();
      for (const a of worldAdds) {
        expect(
          removed.some((r) => r.target === a.target && r.type === a.type && r.listener === a.listener),
          `${a.type} not removed`,
        ).toBe(true);
      }
    } finally {
      proto.addEventListener = origAdd;
      proto.removeEventListener = origRemove;
    }
  });
});

describe('WorldScene feedback ownership text', () => {
  it('aria-label states controls and that station messages appear in the status line', () => {
    const { wrapper } = renderWorld();
    const label = wrapper.getAttribute('aria-label') ?? '';
    expect(label).toContain('W A S D');
    expect(label).toContain('press E near a station');
    expect(label).toContain(
      'Station messages, including why a station cannot be used yet, appear in the status line at the bottom of the screen.',
    );
  });

  it('panel notice shows the exact neutral text after inspecting a station', () => {
    h.target = 'vhs';
    const { wrapper } = renderWorld();
    fireEvent.keyDown(wrapper, { code: 'KeyE', key: 'e' });
    expect(
      screen.getByText(
        'Station request sent. Click the view or press Enter to continue exploring. Messages appear at the bottom of the screen.',
      ),
    ).toBeTruthy();
  });

  it('arcade prompt is identical across re-renders with different memoryShifted values', () => {
    h.target = 'arcade';
    const onInspect = vi.fn();
    const { rerender } = render(createElement(WorldScene, { onInspect, memoryShifted: false }));
    const text = () => document.querySelector('.world-prompt')?.textContent;
    expect(text()).toBe('Press E to use the arcade cabinet');
    rerender(createElement(WorldScene, { onInspect, memoryShifted: true }));
    expect(text()).toBe('Press E to use the arcade cabinet');
    rerender(createElement(WorldScene, { onInspect, memoryShifted: false }));
    expect(text()).toBe('Press E to use the arcade cabinet');
  });
});

describe('WorldScene fallback (no WebGL)', () => {
  it('fallback buttons call onInspect with vhs and arcade', () => {
    setWebgl(false);
    const { onInspect, wrapper } = renderWorld();
    expect(wrapper.getAttribute('tabindex')).toBe('-1');
    expect(document.querySelector('canvas[data-testid]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Inspect the CRT television' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use the arcade cabinet' }));
    expect(onInspect).toHaveBeenNthCalledWith(1, 'vhs');
    expect(onInspect).toHaveBeenNthCalledWith(2, 'arcade');
  });
});
