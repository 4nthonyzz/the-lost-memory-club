// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

const h = vi.hoisted(() => ({
  target: null as 'vhs' | 'arcade' | null,
  heldKeysRef: null as { current: { roles: ReadonlySet<string> } } | null,
}));

vi.mock('./scene/WorldCanvas', () => ({
  WorldCanvas: ({ children }: { children?: ReactNode }) =>
    createElement('div', { 'data-testid': 'canvas' }, children),
}));
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
    usePlayerRig: (opts: {
      onTargetChange: (t: 'vhs' | 'arcade' | null) => void;
      heldKeysRef: { current: { roles: ReadonlySet<string> } };
    }) => {
      h.heldKeysRef = opts.heldKeysRef;
      useEffect(() => {
        opts.onTargetChange(h.target);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return { getTarget: () => h.target };
    },
  };
});

import { WorldScene } from './WorldScene';

const DEFAULT_NOTICE =
  'Station request sent. Click the view or press Enter to continue exploring. Messages appear at the bottom of the screen.';
const PASSIVE_NOTICE =
  'Station request sent. The view resumes when the panel closes. Messages appear at the bottom of the screen.';

const originalGetContext = HTMLCanvasElement.prototype.getContext;
const lockSpy = vi.fn();

beforeEach(() => {
  h.target = null;
  h.heldKeysRef = null;
  lockSpy.mockReset();
  HTMLElement.prototype.requestPointerLock = lockSpy as never;
  HTMLCanvasElement.prototype.getContext = (() => ({})) as never;
});

afterEach(() => {
  cleanup();
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  vi.restoreAllMocks();
});

type Props = { onInspect: (s: 'vhs' | 'arcade') => void; memoryShifted: boolean; inputEnabled?: boolean };

function setup(inputEnabled?: boolean) {
  const onInspect = vi.fn();
  const make = (p: Partial<Props> = {}) =>
    createElement(WorldScene, { onInspect, memoryShifted: false, inputEnabled, ...p } as Props);
  const utils = render(make());
  const wrapper = () => document.querySelector('.world-wrapper') as HTMLElement;
  const text = () => document.querySelector('.world-overlay')?.textContent ?? '';
  const hasCapture = () => document.querySelector('.world-capture') !== null;
  const hasNotice = () => document.querySelector('.world-panel-notice') !== null;
  const withProp = (value: boolean | undefined, extra: Partial<Props> = {}) =>
    utils.rerender(make({ inputEnabled: value, ...extra }));
  return { ...utils, onInspect, wrapper, text, hasCapture, hasNotice, withProp };
}

const pressE = (el: HTMLElement) => fireEvent.keyDown(el, { code: 'KeyE', key: 'e' });
const pressEnter = (el: HTMLElement) => fireEvent.keyDown(el, { code: 'Enter', key: 'Enter' });

describe('WorldScene inputEnabled (jsdom)', () => {
  it('prop absent: E with a target inspects and shows the default panel notice', () => {
    h.target = 'vhs';
    const s = setup();
    pressE(s.wrapper());
    expect(s.onInspect).toHaveBeenCalledTimes(1);
    expect(s.onInspect).toHaveBeenCalledWith('vhs');
    expect(s.hasNotice()).toBe(true);
    expect(s.text()).toContain(DEFAULT_NOTICE);
  });

  it('prop supplied true: E inspects, no panel notice, capture overlay shows, a click locks once', () => {
    h.target = 'arcade';
    const s = setup(true);
    pressE(s.wrapper());
    expect(s.onInspect).toHaveBeenCalledTimes(1);
    expect(s.onInspect).toHaveBeenCalledWith('arcade');
    expect(s.hasNotice()).toBe(false);
    expect(s.hasCapture()).toBe(true);
    expect(lockSpy).not.toHaveBeenCalled();
    fireEvent.click(s.wrapper());
    expect(lockSpy).toHaveBeenCalledTimes(1);
  });

  it('prop toggled true -> false -> true: suspends, ignores input, then needs a fresh click', () => {
    h.target = 'vhs';
    const s = setup(true);
    s.withProp(false);
    expect(s.hasNotice()).toBe(true);
    expect(s.text()).toContain(PASSIVE_NOTICE);
    expect(s.hasCapture()).toBe(false);

    fireEvent.click(s.wrapper());
    pressEnter(s.wrapper());
    pressE(s.wrapper());
    expect(lockSpy).not.toHaveBeenCalled();
    expect(s.onInspect).not.toHaveBeenCalled();
    expect(s.hasNotice()).toBe(true);

    s.withProp(true);
    expect(s.hasNotice()).toBe(false);
    expect(s.hasCapture()).toBe(true);
    expect(lockSpy).not.toHaveBeenCalled();

    fireEvent.click(s.wrapper());
    expect(lockSpy).toHaveBeenCalledTimes(1);
  });

  it('mounting with false starts suspended and a click does nothing', () => {
    const s = setup(false);
    expect(s.text()).toContain(PASSIVE_NOTICE);
    fireEvent.click(s.wrapper());
    expect(lockSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['absent', undefined],
    ['supplied true', true],
  ])('keydown from a focused input outside the wrapper is ignored (%s)', (_n, prop) => {
    h.target = 'vhs';
    const s = setup(prop);
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    fireEvent.keyDown(input, { code: 'KeyW', key: 'w' });
    fireEvent.keyDown(input, { code: 'KeyE', key: 'e' });
    fireEvent.keyDown(input, { code: 'Enter', key: 'Enter' });
    expect(s.onInspect).not.toHaveBeenCalled();
    expect(lockSpy).not.toHaveBeenCalled();
    expect(h.heldKeysRef?.current.roles.size ?? 0).toBe(0);
    input.remove();
  });

  it('prop changes do not re-register listeners; unmount removes them', () => {
    type Rec = { target: EventTarget; type: string; listener: unknown };
    const added: Rec[] = [];
    const removed: Rec[] = [];
    const proto = EventTarget.prototype;
    const origAdd = proto.addEventListener;
    const origRemove = proto.removeEventListener;
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
      const s = setup(true);
      const afterMount = added.length;
      expect(afterMount).toBeGreaterThan(0);
      s.withProp(false);
      s.withProp(true);
      s.withProp(true, { memoryShifted: true });
      expect(added.length).toBe(afterMount);
      expect(removed.length).toBe(0);
      const snapshot = [...added];
      s.unmount();
      for (const a of snapshot) {
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

  it('memoryShifted re-render with supplied prop does not suspend or request lock', () => {
    h.target = 'vhs';
    const s = setup(true);
    expect(s.hasCapture()).toBe(true);
    s.withProp(true, { memoryShifted: true });
    s.withProp(true, { memoryShifted: false });
    expect(s.hasCapture()).toBe(true);
    expect(s.hasNotice()).toBe(false);
    expect(lockSpy).not.toHaveBeenCalled();
    expect(s.onInspect).not.toHaveBeenCalled();
  });
});
