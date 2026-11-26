// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

// The target source is controllable. usePlayerRig is mocked so no R3F frame loop is needed.
// A Station id or a world-local prop id; the mock wraps it in the combined target type (task 23.2).
type TargetId = 'vhs' | 'arcade' | 'desk-lamp-left' | 'desk-lamp-right' | 'manual-snake' | 'manual-maze' | 'manual-frequency' | 'desk-notebook' | 'cork-board' | 'poster-shift' | 'poster-archive';
const h = vi.hoisted(() => ({
  target: null as TargetId | null,
  setTarget: null as ((id: TargetId | null) => void) | null,
  heldKeysRef: null as { current: { roles: ReadonlySet<string> } } | null,
}));

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
  const { INTERACTABLE_DEFS, STATION_DEFS } = await import('./layout/roomLayout');
  const wrap = (id: TargetId | null) => {
    if (id === null) return null;
    if (id === 'vhs' || id === 'arcade') return { type: 'station' as const, station: STATION_DEFS.find((s) => s.id === id)! };
    return { type: 'prop' as const, prop: INTERACTABLE_DEFS.find((d) => d.id === id)! };
  };
  return {
    usePlayerRig: (opts: { onTargetChange: (t: ReturnType<typeof wrap>) => void; heldKeysRef: { current: { roles: ReadonlySet<string> } } }) => {
      h.heldKeysRef = opts.heldKeysRef;
      h.setTarget = (id) => {
        h.target = id;
        opts.onTargetChange(wrap(id));
      };
      useEffect(() => {
        opts.onTargetChange(wrap(h.target));
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return { getTarget: () => wrap(h.target) };
    },
  };
});

import { WorldScene } from './WorldScene';
import { __setWorldAudioFactoryForTests } from './audio/engineFactory';
import type { WorldAudioEngine } from './audio/worldAudio';

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

describe('WorldScene interactable props (task 23.2, 24.2)', () => {
  const prompt = () => document.querySelector('.world-prompt')?.textContent ?? '';
  const message = () => document.querySelector('.world-message-region');
  const card = () => document.querySelector('.world-card');
  const cardTitle = () => card()?.querySelector('.world-card-title')?.textContent ?? null;
  const counter = () => document.querySelector('.world-notes .world-chip')?.textContent ?? null;
  const pressE = (wrapper: HTMLElement) => {
    fireEvent.keyDown(wrapper, { code: 'KeyE', key: 'e' });
    fireEvent.keyUp(wrapper, { code: 'KeyE', key: 'e' });
  };

  it('lamp prompt toggles after E, onInspect is not called, and the status pill shows the exact lamp text', () => {
    h.target = 'desk-lamp-left';
    const { wrapper, onInspect } = renderWorld();
    expect(prompt()).toBe('Press E to turn off desk lamp');
    pressE(wrapper);
    expect(prompt()).toBe('Press E to turn on desk lamp');
    expect(message()?.textContent).toBe("Banker's lamp switched OFF");
    pressE(wrapper);
    expect(prompt()).toBe('Press E to turn off desk lamp');
    expect(message()?.textContent).toBe("Banker's lamp switched ON");
    expect(onInspect).not.toHaveBeenCalled();
    expect(screen.queryByText(/Station request sent/)).toBeNull();
    expect(card()).toBeNull();
  });

  it('the right lamp shows the table lamp pill texts', () => {
    h.target = 'desk-lamp-right';
    const { wrapper } = renderWorld();
    pressE(wrapper);
    expect(message()?.textContent).toBe('Table lamp switched OFF');
    pressE(wrapper);
    expect(message()?.textContent).toBe('Table lamp switched ON');
  });

  it('E on a manual opens its card with the title, E again closes it, and onInspect is never called', () => {
    h.target = 'manual-maze';
    const { wrapper, onInspect } = renderWorld();
    expect(prompt()).toBe('Press E to read: LAST EXIT Manual');
    expect(card()).toBeNull();
    pressE(wrapper);
    expect(cardTitle()).toBe('LAST EXIT Manual');
    expect(card()?.getAttribute('role')).toBe('region');
    expect(card()?.getAttribute('aria-live')).toBe('polite');
    expect(card()?.getAttribute('aria-label')).toBe('LAST EXIT Manual');
    expect(card()?.textContent).toContain('Press 1 / 2 to switch pages · E or move away to close');
    expect(card()?.textContent).toContain('Cabinet status: awaiting service');
    expect(message()?.textContent).toBe('');
    pressE(wrapper);
    expect(card()).toBeNull();
    expect(onInspect).not.toHaveBeenCalled();
  });

  it('E with no target closes an open card, even after the target is lost', () => {
    h.target = 'manual-snake';
    const { wrapper } = renderWorld();
    pressE(wrapper);
    expect(cardTitle()).toBe('SNAKE.EXE Manual');
    act(() => h.setTarget!(null));
    expect(card()).not.toBeNull();
    pressE(wrapper);
    expect(card()).toBeNull();
  });

  it('Escape closes the card and is not prevented', () => {
    h.target = 'cork-board';
    const { wrapper } = renderWorld();
    pressE(wrapper);
    expect(cardTitle()).toBe('Investigation Pinboard');
    const notPrevented = fireEvent.keyDown(wrapper, { code: 'Escape', key: 'Escape' });
    expect(notPrevented).toBe(true);
    expect(card()).toBeNull();
  });

  it('E on a lamp while a card is open closes the card only', () => {
    h.target = 'desk-notebook';
    const { wrapper } = renderWorld();
    pressE(wrapper);
    expect(cardTitle()).toBe('Shift Log Notebook');
    act(() => h.setTarget!('desk-lamp-left'));
    pressE(wrapper);
    expect(card()).toBeNull();
    expect(prompt()).toBe('Press E to turn off desk lamp'); // still ON
    expect(message()?.textContent).toBe('');
    pressE(wrapper);
    expect(message()?.textContent).toBe("Banker's lamp switched OFF");
  });

  it('opening a station closes an open card and still calls onInspect once', () => {
    h.target = 'manual-frequency';
    const { wrapper, onInspect } = renderWorld();
    pressE(wrapper);
    expect(card()).not.toBeNull();
    act(() => h.setTarget!('vhs'));
    pressE(wrapper);
    expect(card()).toBeNull();
    expect(onInspect).toHaveBeenCalledTimes(1);
    expect(onInspect).toHaveBeenCalledWith('vhs');
  });

  it('the card disappears when the world enters inspecting after a station opened', () => {
    h.target = 'poster-shift';
    const { wrapper } = renderWorld();
    pressE(wrapper);
    expect(cardTitle()).toBe('The Signal Remembers');
    act(() => h.setTarget!('arcade'));
    pressE(wrapper);
    expect(card()).toBeNull();
    expect(counter()).toBeNull(); // hidden while inspecting
  });

  it('the notes counter goes 0, 1, unchanged on a re-read, 2 and hides while inspecting', () => {
    h.target = 'manual-snake';
    const { wrapper } = renderWorld();
    expect(counter()).toBe('NOTES READ: 0 / 7');
    expect(document.querySelector('.world-notes')?.getAttribute('aria-label')).toBe('Notes read: 0 of 7');
    pressE(wrapper); // open
    expect(counter()).toBe('NOTES READ: 1 / 7');
    pressE(wrapper); // close
    pressE(wrapper); // re-read
    expect(counter()).toBe('NOTES READ: 1 / 7');
    pressE(wrapper); // close
    act(() => h.setTarget!('manual-maze'));
    pressE(wrapper);
    expect(counter()).toBe('NOTES READ: 2 / 7');
    pressE(wrapper); // close
    act(() => h.setTarget!('desk-lamp-left'));
    pressE(wrapper);
    expect(counter()).toBe('NOTES READ: 2 / 7'); // lamps do not count
    act(() => h.setTarget!('vhs'));
    pressE(wrapper);
    expect(counter()).toBeNull();
  });

  it('25.2: E on the Club Archive Notice opens its card without onInspect and the counter shows / 7', () => {
    h.target = 'poster-archive';
    const { wrapper, onInspect } = renderWorld();
    expect(prompt()).toBe('Press E to read: Club Archive Notice');
    expect(counter()).toBe('NOTES READ: 0 / 7');
    pressE(wrapper);
    expect(cardTitle()).toBe('Club Archive Notice');
    expect(counter()).toBe('NOTES READ: 1 / 7');
    expect(onInspect).not.toHaveBeenCalled();
  });

  it('shows the prompts of the new readable props', () => {
    h.target = 'desk-notebook';
    renderWorld();
    expect(prompt()).toBe('Press E to read: Shift Log Notebook');
    act(() => h.setTarget!('cork-board'));
    expect(prompt()).toBe('Press E to examine: Investigation Pinboard');
    act(() => h.setTarget!('poster-shift'));
    expect(prompt()).toBe("Press E to inspect: 'The Signal Remembers' Poster");
  });

  it('station prompts and inspection are unchanged after a prop interaction', () => {
    h.target = 'desk-lamp-right';
    const { wrapper, onInspect } = renderWorld();
    pressE(wrapper);
    act(() => h.setTarget!('vhs'));
    expect(prompt()).toBe('Press E to inspect the CRT television');
    expect(message()?.textContent).toBe('');
    pressE(wrapper);
    expect(onInspect).toHaveBeenCalledTimes(1);
    expect(onInspect).toHaveBeenCalledWith('vhs');
  });
});
describe('WorldScene themed two-page card (task 27.2)', () => {
  const card = () => document.querySelector('.world-card') as HTMLElement | null;
  const tab = (n: 1 | 2) => document.getElementById(`world-card-tab-${n}`) as HTMLElement;
  // The active page of a book card (aria-current), or the single panel of the other layouts.
  const panelText = () =>
    (document.querySelector('[role="tabpanel"][aria-current="page"]') ?? document.querySelector('[role="tabpanel"]'))?.textContent ?? '';
  const pressE = (wrapper: HTMLElement) => {
    fireEvent.keyDown(wrapper, { code: 'KeyE', key: 'e' });
    fireEvent.keyUp(wrapper, { code: 'KeyE', key: 'e' });
  };
  const open = (id: TargetId) => {
    h.target = id;
    const r = renderWorld();
    pressE(r.wrapper);
    return r;
  };

  it('opens on page 1 with the theme, tabs, status pill, spec pills and the overview blocks', () => {
    open('manual-maze');
    expect(card()?.getAttribute('data-theme')).toBe('maze');
    expect(document.querySelector('[role="tablist"]')).not.toBeNull();
    expect(tab(1).getAttribute('role')).toBe('tab');
    expect(tab(1).textContent).toBe('[1] OVERVIEW & RULES');
    expect(tab(2).textContent).toBe('[2] TECHNICIAN / ANOMALY LOG');
    expect(tab(1).getAttribute('aria-selected')).toBe('true');
    expect(tab(2).getAttribute('aria-selected')).toBe('false');
    expect(card()?.textContent).toContain('CABINET 02 // MAINTENANCE LOCKOUT');
    expect(card()?.querySelectorAll('.world-pill').length).toBeGreaterThanOrEqual(3);
    expect(card()?.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(panelText()).toContain('OBJECTIVE');
    expect(panelText()).toContain('ENTITY HAZARD');
    expect(panelText()).not.toContain('TECHNICIAN LOG');
  });

  it('sets data-theme from the document for every readable prop', () => {
    const expected: Array<[TargetId, string]> = [
      ['manual-snake', 'snake'],
      ['manual-frequency', 'frequency'],
      ['desk-notebook', 'notebook'],
      ['cork-board', 'board'],
      ['poster-shift', 'shift'],
      ['poster-archive', 'notice'],
    ];
    for (const [id, theme] of expected) {
      const r = open(id);
      expect(card()?.getAttribute('data-theme')).toBe(theme);
      r.unmount();
    }
  });

  it('keys 1 and 2 switch pages, claim the keys only while a card is open and never touch pointer lock or onInspect', () => {
    h.target = 'manual-snake';
    const { wrapper, onInspect } = renderWorld();
    // No card open: 1 and 2 do nothing and are not prevented.
    expect(fireEvent.keyDown(wrapper, { code: 'Digit2', key: '2' })).toBe(true);
    expect(card()).toBeNull();
    pressE(wrapper);
    expect(tab(1).getAttribute('aria-selected')).toBe('true');
    expect(panelText()).toContain('OBJECTIVE');
    expect(fireEvent.keyDown(wrapper, { code: 'Digit2', key: '2' })).toBe(false); // prevented while open
    expect(tab(2).getAttribute('aria-selected')).toBe('true');
    expect(tab(1).getAttribute('aria-selected')).toBe('false');
    expect(panelText()).toContain('HIDDEN CODE');
    expect(panelText()).not.toContain('OBJECTIVE');
    fireEvent.keyDown(wrapper, { code: 'Digit1', key: '1' });
    expect(tab(1).getAttribute('aria-selected')).toBe('true');
    expect(panelText()).toContain('OBJECTIVE');
    fireEvent.keyDown(wrapper, { code: 'Numpad2', key: '2' });
    expect(panelText()).toContain('HIDDEN CODE');
    fireEvent.keyDown(wrapper, { code: 'Numpad1', key: '1' });
    expect(panelText()).toContain('OBJECTIVE');
    expect(onInspect).not.toHaveBeenCalled();
    expect(lockSpy).not.toHaveBeenCalled();
    expect(document.querySelector('.world-notes .world-chip')?.textContent).toBe('NOTES READ: 1 / 7');
  });

  it('ignores 1 and 2 from a button or from outside the wrapper', () => {
    open('manual-snake');
    const outside = document.createElement('input');
    document.body.append(outside);
    fireEvent.keyDown(outside, { code: 'Digit2', key: '2' });
    fireEvent.keyDown(tab(1), { code: 'Digit2', key: '2' });
    expect(tab(1).getAttribute('aria-selected')).toBe('true');
    outside.remove();
  });

  it('clicking a page button switches pages and does not request pointer lock or call onInspect', () => {
    h.target = 'manual-frequency';
    const { wrapper, onInspect } = renderWorld();
    pressE(wrapper);
    fireEvent.click(tab(2));
    expect(tab(2).getAttribute('aria-selected')).toBe('true');
    expect(panelText()).toContain('ENGINEERING ANOMALY');
    expect(lockSpy).not.toHaveBeenCalled();
    fireEvent.click(tab(1));
    expect(tab(1).getAttribute('aria-selected')).toBe('true');
    expect(lockSpy).not.toHaveBeenCalled();
    expect(onInspect).not.toHaveBeenCalled();
    // A click on the world itself still requests pointer lock.
    fireEvent.click(wrapper);
    expect(lockSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps the document focus on the world when a page button is pressed with the mouse', () => {
    open('manual-snake');
    const notPrevented = fireEvent.mouseDown(tab(2));
    expect(notPrevented).toBe(false);
  });

  it('E and Escape still close the card from page 2, and the next open starts on page 1', () => {
    h.target = 'cork-board';
    const { wrapper } = renderWorld();
    pressE(wrapper);
    fireEvent.keyDown(wrapper, { code: 'Digit2', key: '2' });
    expect(tab(2).getAttribute('aria-selected')).toBe('true');
    pressE(wrapper);
    expect(card()).toBeNull();
    pressE(wrapper);
    expect(tab(1).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(wrapper, { code: 'Digit2', key: '2' });
    expect(fireEvent.keyDown(wrapper, { code: 'Escape', key: 'Escape' })).toBe(true);
    expect(card()).toBeNull();
    expect(document.querySelector('.world-notes .world-chip')?.textContent).toBe('NOTES READ: 1 / 7');
  });

  it('keeps the card non-modal and the prompts unchanged', () => {
    h.target = 'manual-snake';
    const { wrapper } = renderWorld();
    pressE(wrapper);
    expect(card()?.getAttribute('role')).toBe('region');
    expect(card()?.closest('[aria-modal]')).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(wrapper.contains(card())).toBe(true);
    expect(document.querySelector('.world-prompt')?.textContent).toBe('Press E to read: SNAKE.EXE Manual');
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

describe('WorldScene scrollable card (task 28.1)', () => {
  const card = () => document.querySelector('.world-card') as HTMLElement | null;
  const held = () => [...(h.heldKeysRef?.current.roles ?? [])];
  const pressE = (wrapper: HTMLElement) => {
    fireEvent.keyDown(wrapper, { code: 'KeyE', key: 'e' });
    fireEvent.keyUp(wrapper, { code: 'KeyE', key: 'e' });
  };
  /** jsdom does no layout: give the card a scrollTop backing value and a client height. */
  const makeScrollable = (el: HTMLElement) => {
    let top = 0;
    Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => top, set: (v: number) => { top = Math.max(0, v); } });
    Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => 300 });
    return el;
  };
  const open = (id: TargetId = 'manual-snake') => {
    h.target = id;
    const r = renderWorld();
    pressE(r.wrapper);
    return { ...r, el: makeScrollable(card()!) };
  };
  const wheel = (deltaY: number, deltaMode = 0) => {
    const e = new WheelEvent('wheel', { deltaY, deltaMode, cancelable: true });
    window.dispatchEvent(e);
    return e;
  };

  it('wheel scrolls the card and is prevented; lines and pages are normalised to pixels', () => {
    const { el } = open();
    const e = wheel(100);
    expect(e.defaultPrevented).toBe(true);
    expect(el.scrollTop).toBe(100);
    wheel(2, 1);
    expect(el.scrollTop).toBe(132);
    wheel(1, 2);
    expect(el.scrollTop).toBe(432);
  });

  it('wheel does nothing without a card, and the listener follows the card lifetime', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    h.target = 'manual-snake';
    const { wrapper, unmount } = renderWorld();
    expect(wheel(100).defaultPrevented).toBe(false);
    expect(add.mock.calls.filter((c) => c[0] === 'wheel')).toHaveLength(0);
    pressE(wrapper);
    const added = add.mock.calls.filter((c) => c[0] === 'wheel');
    expect(added).toHaveLength(1);
    expect(added[0][2]).toEqual({ passive: false });
    fireEvent.keyDown(wrapper, { code: 'Escape', key: 'Escape' });
    expect(card()).toBeNull();
    expect(remove.mock.calls.filter((c) => c[0] === 'wheel')).toHaveLength(1);
    expect(wheel(100).defaultPrevented).toBe(false);
    pressE(wrapper);
    expect(add.mock.calls.filter((c) => c[0] === 'wheel')).toHaveLength(2);
    unmount();
    expect(remove.mock.calls.filter((c) => c[0] === 'wheel')).toHaveLength(2);
  });

  it('ArrowDown and ArrowUp scroll the card, are prevented and do not become held movement keys; W still moves', () => {
    const { wrapper, el } = open();
    expect(fireEvent.keyDown(wrapper, { code: 'ArrowDown', key: 'ArrowDown' })).toBe(false);
    expect(el.scrollTop).toBe(48);
    expect(held()).not.toContain('backward');
    fireEvent.keyDown(wrapper, { code: 'ArrowDown', key: 'ArrowDown', repeat: true });
    expect(el.scrollTop).toBe(96);
    expect(fireEvent.keyDown(wrapper, { code: 'ArrowUp', key: 'ArrowUp' })).toBe(false);
    expect(el.scrollTop).toBe(48);
    expect(held()).not.toContain('forward');
    fireEvent.keyDown(wrapper, { code: 'KeyW', key: 'w' });
    expect(held()).toContain('forward');
    expect(el.scrollTop).toBe(48);
    fireEvent.keyDown(wrapper, { code: 'ArrowLeft', key: 'ArrowLeft' });
    expect(held()).toContain('left');
  });

  it('PageDown and PageUp scroll by about one page', () => {
    const { wrapper, el } = open();
    expect(fireEvent.keyDown(wrapper, { code: 'PageDown', key: 'PageDown' })).toBe(false);
    expect(el.scrollTop).toBe(268);
    fireEvent.keyDown(wrapper, { code: 'PageUp', key: 'PageUp' });
    expect(el.scrollTop).toBe(0);
    expect(held()).toEqual([]);
  });

  it('without a card ArrowUp / ArrowDown move the player and PageDown is not claimed', () => {
    const { wrapper } = renderWorld();
    expect(fireEvent.keyDown(wrapper, { code: 'ArrowUp', key: 'ArrowUp' })).toBe(false);
    expect(held()).toContain('forward');
    fireEvent.keyDown(wrapper, { code: 'ArrowDown', key: 'ArrowDown' });
    expect(held()).toContain('backward');
    expect(fireEvent.keyDown(wrapper, { code: 'PageDown', key: 'PageDown' })).toBe(true);
    expect(wheel(100).defaultPrevented).toBe(false);
  });

  it('arrows held before the card opens stop moving the player, W held stays', () => {
    h.target = 'manual-snake';
    const { wrapper } = renderWorld();
    fireEvent.keyDown(wrapper, { code: 'ArrowUp', key: 'ArrowUp' });
    fireEvent.keyDown(wrapper, { code: 'KeyS', key: 's' });
    expect(held()).toEqual(expect.arrayContaining(['forward', 'backward']));
    pressE(wrapper);
    expect(held()).toEqual(['backward']);
    fireEvent.keyDown(wrapper, { code: 'KeyW', key: 'w' });
    fireEvent.keyUp(wrapper, { code: 'ArrowUp', key: 'ArrowUp' });
    expect(held()).toContain('forward');
  });

  it('scrollTop resets on a page switch and when another document opens', () => {
    const { wrapper, el } = open('cork-board');
    wheel(200);
    expect(el.scrollTop).toBe(200);
    fireEvent.keyDown(wrapper, { code: 'Digit2', key: '2' });
    expect(el.scrollTop).toBe(0);
    wheel(150);
    expect(el.scrollTop).toBe(150);
    // E on nothing closes the card; the next document starts at the top.
    act(() => h.setTarget!(null));
    pressE(wrapper);
    expect(card()).toBeNull();
    act(() => h.setTarget!('manual-maze'));
    pressE(wrapper);
    expect(card()?.getAttribute('data-card-id')).toBe('manual-maze');
    expect(card()!.scrollTop).toBe(0);
  });

  it('clicks and mousedown on the card body or scrollbar never request pointer lock; the canvas still does', () => {
    const { el } = open();
    const body = el.querySelector('.world-card-body') as HTMLElement;
    for (const node of [body, el]) {
      fireEvent.mouseDown(node);
      fireEvent.click(node);
    }
    expect(lockSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('canvas'));
    expect(lockSpy).toHaveBeenCalledTimes(1);
  });

  it('page tab buttons still work by click and E / Esc / 1 / 2 are unchanged', () => {
    const { wrapper } = open();
    fireEvent.click(document.getElementById('world-card-tab-2')!);
    expect(document.getElementById('world-card-tab-2')!.getAttribute('aria-selected')).toBe('true');
    expect(lockSpy).not.toHaveBeenCalled();
    fireEvent.keyDown(wrapper, { code: 'Digit1', key: '1' });
    expect(document.getElementById('world-card-tab-1')!.getAttribute('aria-selected')).toBe('true');
    h.setTarget!(null as never);
    pressE(wrapper);
    expect(card()).toBeNull();
  });
});

describe('WorldScene open-book manuals (task 29.1)', () => {
  const card = () => document.querySelector('.world-card') as HTMLElement | null;
  const page = (n: 1 | 2) => document.getElementById(`world-card-page-${n}`) as HTMLElement;
  const tab = (n: 1 | 2) => document.getElementById(`world-card-tab-${n}`) as HTMLElement;
  const pressE = (wrapper: HTMLElement) => {
    fireEvent.keyDown(wrapper, { code: 'KeyE', key: 'e' });
    fireEvent.keyUp(wrapper, { code: 'KeyE', key: 'e' });
  };
  const open = (id: TargetId = 'manual-snake') => {
    h.target = id;
    const r = renderWorld();
    pressE(r.wrapper);
    return r;
  };
  const makeScrollable = (el: HTMLElement) => {
    let top = 0;
    Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => top, set: (v: number) => { top = Math.max(0, v); } });
    Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => 300 });
    return el;
  };
  const wheel = (deltaY: number) => {
    const e = new WheelEvent('wheel', { deltaY, cancelable: true });
    window.dispatchEvent(e);
    return e;
  };

  it('opens as a two-page book with headings, page numbers, stamp and the manual theme', () => {
    open('manual-snake');
    expect(card()?.getAttribute('data-layout')).toBe('book');
    expect(card()?.classList.contains('world-card--book')).toBe(true);
    expect(card()?.getAttribute('data-theme')).toBe('snake');
    expect(page(1).textContent).toContain('PAGE 01 // OVERVIEW & RULES');
    expect(page(1).textContent).toContain('OBJECTIVE');
    expect(page(1).textContent).toContain('P. 01');
    expect(page(2).textContent).toContain('PAGE 02 // TECHNICIAN / ANOMALY LOG');
    expect(page(2).textContent).toContain('HIDDEN CODE');
    expect(page(2).textContent).toContain('P. 02');
    const stamp = card()!.querySelector('.world-book-stamp');
    expect(stamp?.textContent).toBe('LOST MEMORY CLUB // ARCHIVE COPY');
    expect(stamp?.getAttribute('aria-hidden')).toBe('true');
    expect(card()!.querySelector('.world-book-spine')?.getAttribute('aria-hidden')).toBe('true');
    expect(card()!.textContent).toContain('Press 1 / 2 to switch pages');
  });

  it('page 1 is active at open: aria-selected tab, aria-current page and one ribbon; accessible tab structure', () => {
    open('manual-snake');
    expect(tab(1).getAttribute('aria-selected')).toBe('true');
    expect(tab(2).getAttribute('aria-selected')).toBe('false');
    expect(tab(1).getAttribute('aria-controls')).toBe('world-card-page-1');
    expect(tab(2).getAttribute('aria-controls')).toBe('world-card-page-2');
    for (const n of [1, 2] as const) {
      expect(page(n).getAttribute('role')).toBe('tabpanel');
      expect(page(n).getAttribute('aria-labelledby')).toBe(`world-card-tab-${n}`);
    }
    expect(page(1).getAttribute('aria-current')).toBe('page');
    expect(page(2).hasAttribute('aria-current')).toBe(false);
    expect(card()!.querySelectorAll('.world-book-ribbon')).toHaveLength(1);
    expect(page(1).querySelector('.world-book-ribbon')).not.toBeNull();
    expect(document.querySelector('[role="tablist"]')).not.toBeNull();
  });

  it('Digit2 makes page 2 active without hiding page 1; Digit1 returns', () => {
    const { wrapper } = open('manual-snake');
    fireEvent.keyDown(wrapper, { code: 'Digit2', key: '2' });
    expect(tab(2).getAttribute('aria-selected')).toBe('true');
    expect(page(2).getAttribute('aria-current')).toBe('page');
    expect(page(1).hasAttribute('aria-current')).toBe(false);
    expect(page(2).querySelector('.world-book-ribbon')).not.toBeNull();
    expect(page(1).querySelector('.world-book-ribbon')).toBeNull();
    expect(page(1).hasAttribute('hidden')).toBe(false);
    expect(page(1).textContent).toContain('OBJECTIVE');
    fireEvent.keyDown(wrapper, { code: 'Digit1', key: '1' });
    expect(page(1).getAttribute('aria-current')).toBe('page');
  });

  it('clicking a page (not a button) makes it active, keeps focus on the world and never requests pointer lock', () => {
    open('manual-snake');
    const body = page(2).querySelector('.world-card-body') as HTMLElement;
    expect(fireEvent.mouseDown(body)).toBe(false); // default prevented: focus stays on the wrapper
    fireEvent.click(body);
    expect(page(2).getAttribute('aria-current')).toBe('page');
    expect(tab(2).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(page(1));
    expect(page(1).getAttribute('aria-current')).toBe('page');
    expect(lockSpy).not.toHaveBeenCalled();
  });

  it('wheel and ArrowDown still scroll the card and do not move the player', () => {
    const { wrapper } = open('manual-snake');
    const el = makeScrollable(card()!);
    expect(wheel(120).defaultPrevented).toBe(true);
    expect(el.scrollTop).toBe(120);
    expect(fireEvent.keyDown(wrapper, { code: 'ArrowDown', key: 'ArrowDown' })).toBe(false);
    expect(el.scrollTop).toBe(168);
    expect([...(h.heldKeysRef?.current.roles ?? [])]).not.toContain('backward');
  });

  it('a page switch does not reset scrollTop in the side-by-side layout, but a new document does', () => {
    const { wrapper } = open('manual-snake');
    const el = makeScrollable(card()!);
    wheel(200);
    fireEvent.keyDown(wrapper, { code: 'Digit2', key: '2' });
    expect(el.scrollTop).toBe(200);
  });

  describe('stacked layout', () => {
    const OriginalRO = globalThis.ResizeObserver;
    let roCallback: ((entries: unknown[]) => void) | null = null;
    beforeEach(() => {
      roCallback = null;
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(cb: (entries: unknown[]) => void) {
            roCallback = cb;
          }
          observe() {}
          unobserve() {}
          disconnect() {}
        },
      );
    });
    afterEach(() => {
      vi.unstubAllGlobals();
      if (OriginalRO) globalThis.ResizeObserver = OriginalRO;
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    });

    it('scrolls the chosen page into view when the card is narrow, and not when it is wide', () => {
      const scrollIntoView = vi.fn();
      (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView = scrollIntoView;
      const { wrapper } = open('manual-snake');
      expect(roCallback).not.toBeNull();
      act(() => roCallback!([{ contentRect: { width: 900 } }]));
      fireEvent.keyDown(wrapper, { code: 'Digit2', key: '2' });
      expect(scrollIntoView).not.toHaveBeenCalled();
      act(() => roCallback!([{ contentRect: { width: 500 } }]));
      fireEvent.keyDown(wrapper, { code: 'Digit1', key: '1' });
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
      fireEvent.click(tab(2));
      expect(scrollIntoView).toHaveBeenCalledTimes(2);
    });

    it('does not throw when scrollIntoView is missing', () => {
      const { wrapper } = open('manual-snake');
      act(() => roCallback!([{ contentRect: { width: 400 } }]));
      expect(() => fireEvent.keyDown(wrapper, { code: 'Digit2', key: '2' })).not.toThrow();
      expect(tab(2).getAttribute('aria-selected')).toBe('true');
    });
  });

  it('maze and frequency use the book layout; the four room clues do not', () => {
    for (const id of ['manual-maze', 'manual-frequency'] as const) {
      const r = open(id);
      expect(card()?.getAttribute('data-layout')).toBe('book');
      r.unmount();
    }
    for (const id of ['desk-notebook', 'cork-board', 'poster-shift', 'poster-archive'] as const) {
      const r = open(id);
      expect(card()?.getAttribute('data-layout')).toBeNull();
      expect(card()?.querySelector('.world-book')).toBeNull();
      expect(document.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);
      r.unmount();
    }
  });

  it('E and Escape still close a book card', () => {
    const { wrapper } = open('manual-maze');
    pressE(wrapper);
    expect(card()).toBeNull();
    pressE(wrapper);
    expect(card()).not.toBeNull();
    expect(fireEvent.keyDown(wrapper, { code: 'Escape', key: 'Escape' })).toBe(true);
    expect(card()).toBeNull();
  });

  it('removes the wheel listener on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = open('manual-snake');
    unmount();
    expect(remove.mock.calls.filter((c) => c[0] === 'wheel')).toHaveLength(1);
  });
});

describe('WorldScene procedural audio (task 32.2)', () => {
  type Fake = { [K in keyof WorldAudioEngine]: ReturnType<typeof vi.fn> };
  let fake: Fake;
  let created: number;
  let muted: boolean;
  const sources = import.meta.glob(['./WorldScene.tsx', './audio/engineFactory.ts', './overlay/AudioBadge.tsx'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  beforeEach(() => {
    muted = false;
    created = 0;
    fake = {
      unlock: vi.fn(),
      setHidden: vi.fn(),
      setDucked: vi.fn(),
      setMuted: vi.fn(),
      toggleMuted: vi.fn(() => {
        muted = !muted;
        return muted;
      }),
      isMuted: vi.fn(() => muted),
      isUnlocked: vi.fn(() => true),
      tick: vi.fn(),
      playVhsInsertSfx: vi.fn(),
      playArcadeCoinSfx: vi.fn(),
      playLampSwitchSfx: vi.fn(),
      playPageRustleSfx: vi.fn(),
      dispose: vi.fn(),
    };
    __setWorldAudioFactoryForTests(() => {
      created += 1;
      return fake as unknown as WorldAudioEngine;
    });
  });
  afterEach(() => __setWorldAudioFactoryForTests(null));

  const badge = () => document.querySelector('.world-audio-button') as HTMLButtonElement;
  const pressE = (wrapper: HTMLElement) => {
    fireEvent.keyDown(wrapper, { code: 'KeyE', key: 'e' });
    fireEvent.keyUp(wrapper, { code: 'KeyE', key: 'e' });
  };

  it('does not unlock on mount, focus or re-render; unlocks on the first click and on an accepted keydown', () => {
    const onInspect = vi.fn();
    const { rerender } = render(createElement(WorldScene, { onInspect, memoryShifted: false }));
    const wrapper = document.querySelector('.world-wrapper') as HTMLElement;
    wrapper.focus();
    fireEvent.focus(wrapper);
    rerender(createElement(WorldScene, { onInspect, memoryShifted: true }));
    expect(fake.unlock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('canvas'));
    expect(fake.unlock).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(wrapper, { code: 'KeyW', key: 'w' });
    expect(fake.unlock).toHaveBeenCalledTimes(2);
    const outside = document.createElement('input');
    document.body.append(outside);
    fireEvent.keyDown(outside, { code: 'KeyW', key: 'w' });
    outside.remove();
    expect(fake.unlock).toHaveBeenCalledTimes(2);
  });

  it('creates one engine per mount and disposes it on unmount', () => {
    const { unmount } = renderWorld();
    fireEvent.click(screen.getByTestId('canvas'));
    expect(created).toBe(1);
    expect(fake.dispose).not.toHaveBeenCalled();
    unmount();
    expect(fake.dispose).toHaveBeenCalledTimes(1);
  });

  it('E on the CRT plays the insert sound and still calls onInspect once', () => {
    h.target = 'vhs';
    const { wrapper, onInspect } = renderWorld();
    pressE(wrapper);
    expect(fake.playVhsInsertSfx).toHaveBeenCalledTimes(1);
    expect(fake.playArcadeCoinSfx).not.toHaveBeenCalled();
    expect(onInspect).toHaveBeenCalledTimes(1);
    expect(onInspect).toHaveBeenCalledWith('vhs');
  });

  it('E on the arcade cabinet plays the coin sound and still calls onInspect once', () => {
    h.target = 'arcade';
    const { wrapper, onInspect } = renderWorld();
    pressE(wrapper);
    expect(fake.playArcadeCoinSfx).toHaveBeenCalledTimes(1);
    expect(fake.playVhsInsertSfx).not.toHaveBeenCalled();
    expect(onInspect).toHaveBeenCalledWith('arcade');
  });

  it('the WebGL fallback buttons unlock, play the same sounds and call onInspect', () => {
    setWebgl(false);
    const { onInspect } = renderWorld();
    fireEvent.click(screen.getByRole('button', { name: 'Inspect the CRT television' }));
    expect(fake.unlock).toHaveBeenCalledTimes(1);
    expect(fake.playVhsInsertSfx).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Use the arcade cabinet' }));
    expect(fake.playArcadeCoinSfx).toHaveBeenCalledTimes(1);
    expect(onInspect).toHaveBeenNthCalledWith(1, 'vhs');
    expect(onInspect).toHaveBeenNthCalledWith(2, 'arcade');
  });

  it('a lamp toggle plays the switch sound; closing nothing else plays', () => {
    h.target = 'desk-lamp-left';
    const { wrapper } = renderWorld();
    pressE(wrapper);
    pressE(wrapper);
    expect(fake.playLampSwitchSfx).toHaveBeenCalledTimes(2);
    expect(fake.playPageRustleSfx).not.toHaveBeenCalled();
  });

  it('opening a card rustles once; a real page switch rustles again; the active page and closing are silent', () => {
    h.target = 'manual-snake';
    const { wrapper } = renderWorld();
    pressE(wrapper);
    expect(fake.playPageRustleSfx).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(wrapper, { code: 'Digit1', key: '1' }); // already page 1
    expect(fake.playPageRustleSfx).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(wrapper, { code: 'Digit2', key: '2' });
    expect(fake.playPageRustleSfx).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(wrapper, { code: 'Digit2', key: '2' });
    expect(fake.playPageRustleSfx).toHaveBeenCalledTimes(2);
    fireEvent.click(document.getElementById('world-card-tab-1')!);
    expect(fake.playPageRustleSfx).toHaveBeenCalledTimes(3);
    fireEvent.click(document.getElementById('world-card-tab-1')!);
    expect(fake.playPageRustleSfx).toHaveBeenCalledTimes(3);
    pressE(wrapper); // closes the card
    expect(document.querySelector('.world-card')).toBeNull();
    expect(fake.playPageRustleSfx).toHaveBeenCalledTimes(3);
    expect(fake.playLampSwitchSfx).not.toHaveBeenCalled();
  });

  it('KeyM toggles mute and the badge text, aria-pressed and label follow; it is prevented and never held', () => {
    const { wrapper } = renderWorld();
    expect(badge().textContent).toBe('AUDIO: ON [M]');
    expect(badge().getAttribute('aria-pressed')).toBe('false');
    expect(badge().getAttribute('aria-label')).toBe('Toggle audio (M)');
    expect(fireEvent.keyDown(wrapper, { code: 'KeyM', key: 'm' })).toBe(false);
    expect(fake.toggleMuted).toHaveBeenCalledTimes(1);
    expect(badge().textContent).toBe('AUDIO: MUTED [M]');
    expect(badge().getAttribute('aria-pressed')).toBe('true');
    expect([...(h.heldKeysRef?.current.roles ?? [])]).not.toContain('mute');
    fireEvent.keyDown(wrapper, { code: 'KeyM', key: 'm', repeat: true });
    expect(fake.toggleMuted).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(wrapper, { code: 'KeyM', key: 'm' });
    expect(badge().textContent).toBe('AUDIO: ON [M]');
    expect(document.querySelector('.world-audio')?.getAttribute('role')).toBe('status');
  });

  it('KeyM works while a card is open and is ignored from inputs and outside the wrapper', () => {
    h.target = 'manual-snake';
    const { wrapper } = renderWorld();
    pressE(wrapper);
    fireEvent.keyDown(wrapper, { code: 'KeyM', key: 'm' });
    expect(fake.toggleMuted).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.world-card')).not.toBeNull();
    const input = document.createElement('input');
    document.body.append(input);
    fireEvent.keyDown(input, { code: 'KeyM', key: 'm' });
    fireEvent.keyDown(document.body, { code: 'KeyM', key: 'm' });
    input.remove();
    expect(fake.toggleMuted).toHaveBeenCalledTimes(1);
  });

  it('clicking the badge toggles mute and never requests pointer lock', () => {
    renderWorld();
    fireEvent.click(badge());
    expect(fake.toggleMuted).toHaveBeenCalledTimes(1);
    expect(badge().textContent).toBe('AUDIO: MUTED [M]');
    expect(lockSpy).not.toHaveBeenCalled();
    expect(fireEvent.mouseDown(badge())).toBe(false); // keeps the focus on the world
  });

  it('lists the audio key in the controls hint', () => {
    renderWorld();
    expect(screen.getByText('M: toggle audio')).toBeTruthy();
  });

  it('ducks while a station panel is open and restores on resume', () => {
    h.target = 'vhs';
    const { wrapper } = renderWorld();
    expect(fake.setDucked).toHaveBeenLastCalledWith(false);
    pressE(wrapper);
    expect(fake.setDucked).toHaveBeenLastCalledWith(true);
    fireEvent.keyUp(wrapper, { code: 'KeyE', key: 'e' });
    fireEvent.keyDown(wrapper, { code: 'Enter', key: 'Enter' });
    expect(fake.setDucked).toHaveBeenLastCalledWith(false);
  });

  it('follows a supplied inputEnabled prop', () => {
    const onInspect = vi.fn();
    const { rerender } = render(createElement(WorldScene, { onInspect, memoryShifted: false, inputEnabled: false }));
    expect(fake.setDucked).toHaveBeenLastCalledWith(true);
    rerender(createElement(WorldScene, { onInspect, memoryShifted: false, inputEnabled: true }));
    expect(fake.setDucked).toHaveBeenLastCalledWith(false);
    rerender(createElement(WorldScene, { onInspect, memoryShifted: false, inputEnabled: false }));
    expect(fake.setDucked).toHaveBeenLastCalledWith(true);
  });

  it('visibilitychange forwards document.hidden and never unlocks; unmount removes the listener', () => {
    const { unmount } = renderWorld();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    try {
      document.dispatchEvent(new Event('visibilitychange'));
      expect(fake.setHidden).toHaveBeenLastCalledWith(true);
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(fake.setHidden).toHaveBeenLastCalledWith(false);
      expect(fake.unlock).not.toHaveBeenCalled();
      unmount();
      const calls = fake.setHidden.mock.calls.length;
      document.dispatchEvent(new Event('visibilitychange'));
      expect(fake.setHidden.mock.calls.length).toBe(calls);
    } finally {
      delete (document as { hidden?: boolean }).hidden;
    }
  });

  it('introduces no timers in the audio wiring', () => {
    for (const [name, src] of Object.entries(sources)) {
      if (name.endsWith('WorldScene.tsx')) {
        // The documented 3 s context-loss timer is the only one.
        expect(src.match(/setTimeout\(/g)).toHaveLength(1);
        expect(src).not.toMatch(/setInterval\(/);
      } else {
        expect(src).not.toMatch(/setTimeout|setInterval/);
      }
    }
  });
});
