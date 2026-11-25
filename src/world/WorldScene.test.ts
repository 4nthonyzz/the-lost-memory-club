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
    usePlayerRig: (opts: { onTargetChange: (t: ReturnType<typeof wrap>) => void }) => {
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
  const panelText = () => document.querySelector('[role="tabpanel"]')?.textContent ?? '';
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
