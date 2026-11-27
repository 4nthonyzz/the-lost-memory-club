// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const h = vi.hoisted(() => ({
  inputEnabled: undefined as boolean | undefined,
  memoryShifted: undefined as boolean | undefined,
}));

vi.mock('./world/WorldScene', async () => {
  const { createElement: ce } = await import('react');
  return {
    WorldScene: (props: {
      inputEnabled?: boolean;
      memoryShifted: boolean;
      onInspect: (s: 'vhs' | 'arcade') => void;
    }) => {
      h.inputEnabled = props.inputEnabled;
      h.memoryShifted = props.memoryShifted;
      return ce(
        'div',
        { className: 'world-wrapper', tabIndex: 0 },
        ce('button', { type: 'button', onClick: () => props.onInspect('vhs') }, 'stub-vhs'),
        ce('button', { type: 'button', onClick: () => props.onInspect('arcade') }, 'stub-arcade'),
      );
    },
  };
});

import { App } from './App';

const LOCK_MESSAGE = 'ARCADE LOCKED · Recover the VHS clue first.';

// Some Node versions expose a broken global localStorage that shadows jsdom's. Install a simple in-memory Storage.
function installMemoryStorage() {
  const data = new Map<string, string>();
  const storage: Storage = {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (k) => (data.has(k) ? data.get(k)! : null),
    key: (i) => Array.from(data.keys())[i] ?? null,
    removeItem: (k) => { data.delete(k); },
    setItem: (k, v) => { data.set(k, String(v)); },
  };
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
}

beforeEach(() => {
  installMemoryStorage();
  h.inputEnabled = undefined;
  h.memoryShifted = undefined;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderApp() {
  return render(createElement(App));
}

function status() {
  return screen.getByRole('status').textContent;
}

describe('App full-screen shell', () => {
  it('starts with no overlay and input enabled', () => {
    renderApp();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(h.inputEnabled).toBe(true);
    expect(h.memoryShifted).toBe(false);
    expect(screen.getByText('PROTOTYPE')).toBeTruthy();
  });

  it('opens the VHS dialog, disables world input and moves focus inside', () => {
    renderApp();
    fireEvent.click(screen.getByText('stub-vhs'));
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(h.inputEnabled).toBe(false);
    expect(status()).toBe('CRT STATION CONNECTED');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('Escape closes the dialog, prevents default, re-enables input and focuses the world', () => {
    renderApp();
    fireEvent.click(screen.getByText('stub-vhs'));
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true });
    act(() => { window.dispatchEvent(event); });
    expect(event.defaultPrevented).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(h.inputEnabled).toBe(true);
    expect(document.activeElement).toBe(document.querySelector('.world-wrapper'));
  });

  it('the Close button closes the dialog', () => {
    renderApp();
    fireEvent.click(screen.getByText('stub-vhs'));
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(h.inputEnabled).toBe(true);
  });

  it('locked arcade shows the exact lock message and opens nothing', () => {
    renderApp();
    fireEvent.click(screen.getByText('stub-arcade'));
    expect(status()).toBe(LOCK_MESSAGE);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(h.inputEnabled).toBe(true);
  });

  it('opens the arcade dialog after collecting the tape and the clue', () => {
    renderApp();
    fireEvent.click(screen.getByText('stub-vhs'));
    fireEvent.click(screen.getByText('Collect prototype tape'));
    fireEvent.click(screen.getByText('Inspect label clue'));
    expect(status()).toBe('CLUE CONFIRMED · The arcade is now unlocked.');
    fireEvent.click(screen.getByText('Close'));
    fireEvent.click(screen.getByText('stub-arcade'));
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('Arcade station');
    expect(h.inputEnabled).toBe(false);
    fireEvent.click(screen.getByText('Initialize arcade session'));
    expect(status()).toBe('Arcade initialization event logged. Gameplay is pending.');
  });

  it('reset clears progress and closes any dialog', () => {
    renderApp();
    fireEvent.click(screen.getByText('stub-vhs'));
    fireEvent.click(screen.getByText('Collect prototype tape'));
    fireEvent.click(screen.getByText('Close'));
    const toggle = screen.getByText('Menu');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByText('Reset local prototype state'));
    expect(status()).toBe('Development save reset.');
    fireEvent.click(screen.getByText('stub-vhs'));
    expect(screen.getByText('Collect prototype tape')).toBeTruthy();
  });

  it('adds the Escape listener only while open and removes it on close and unmount', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const keydownAdds = () => add.mock.calls.filter((c) => c[0] === 'keydown').length;
    const keydownRemoves = () => remove.mock.calls.filter((c) => c[0] === 'keydown').length;
    const { unmount } = renderApp();
    expect(keydownAdds()).toBe(0);
    fireEvent.click(screen.getByText('stub-vhs'));
    expect(keydownAdds()).toBe(1);
    fireEvent.click(screen.getByText('Close'));
    expect(keydownRemoves()).toBe(1);
    fireEvent.click(screen.getByText('stub-vhs'));
    expect(keydownAdds()).toBe(2);
    unmount();
    expect(keydownRemoves()).toBe(2);
  });
});
