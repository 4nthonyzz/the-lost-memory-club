// @vitest-environment jsdom
import { createElement } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEAD_FREQUENCY_GAME_ID,
  FIRST_CLUE_ID,
  FIRST_TAPE_ID,
  MEMORY_ID,
  SAVE_KEY,
  SECOND_CLUE_ID,
  SECOND_TAPE_ID,
  SECRET_BOX_ID,
  SHADOW_FIGHT_GAME_ID,
  SNAKE_GAME_ID,
  THIRD_CLUE_ID,
  THIRD_TAPE_ID,
} from './core/contracts';

/** Observed by the world stub: the three props the App is allowed to pass. */
const world = vi.hoisted(() => ({
  inputEnabled: undefined as boolean | undefined,
  memoryShifted: undefined as boolean | undefined,
}));

vi.mock('./world/WorldScene', async () => {
  const { createElement: ce } = await import('react');
  return {
    WorldScene: (props: {
      inputEnabled?: boolean;
      memoryShifted: boolean;
      onInspect: (station: 'vhs' | 'arcade') => void;
    }) => {
      world.inputEnabled = props.inputEnabled;
      world.memoryShifted = props.memoryShifted;
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

// Some Node versions expose a broken global localStorage that shadows jsdom's. Install a simple in-memory Storage.
function installMemoryStorage() {
  const data = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => (data.has(k) ? data.get(k)! : null),
    key: (i) => Array.from(data.keys())[i] ?? null,
    removeItem: (k) => {
      data.delete(k);
    },
    setItem: (k, v) => {
      data.set(k, String(v));
    },
  };
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
}

const TAPES = [FIRST_TAPE_ID, SECOND_TAPE_ID, THIRD_TAPE_ID];
const CLUES = [FIRST_CLUE_ID, SECOND_CLUE_ID, THIRD_CLUE_ID];
const GAMES = [SNAKE_GAME_ID, SHADOW_FIGHT_GAME_ID, DEAD_FREQUENCY_GAME_ID];
const PHOTOS = TAPES.map((tapeId) => `${tapeId}:${tapeId}-memory`);

/** A saved run. parseSave replays these facts through the reducer, so every gate still applies. */
function seedRun(overrides: Record<string, unknown> = {}): void {
  const snapshot = {
    version: 2,
    collectedTapes: [],
    discoveredClues: [],
    completedArcades: [],
    restoredMemories: [],
    capturedPhotos: [],
    collectedSecrets: [],
    calendarDate: '17-08-97',
    introCompleted: true,
    endingUnlocked: false,
    chosenEnding: null,
    startedAt: 1_000,
    finishedAt: null,
    ...overrides,
  };
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
}

/** Every gate open except the optional extras, which the test turns off one by one. */
function completedStory(extra: { photos?: boolean; box?: boolean; restored?: boolean } = {}): void {
  seedRun({
    collectedTapes: TAPES,
    discoveredClues: CLUES,
    completedArcades: GAMES,
    restoredMemories: extra.restored === false ? [] : [MEMORY_ID],
    capturedPhotos: extra.photos === false ? [] : PHOTOS,
    collectedSecrets: extra.box === false ? [] : [SECRET_BOX_ID],
    calendarDate: '31-09-98',
  });
}

function savedState(): { introCompleted: boolean; chosenEnding: string | null; collectedTapes: string[] } {
  return JSON.parse(window.localStorage.getItem(SAVE_KEY) ?? '{}');
}

function renderApp() {
  return render(createElement(App));
}

beforeEach(() => {
  installMemoryStorage();
  world.inputEnabled = undefined;
  world.memoryShifted = undefined;
  // jsdom has no canvas implementation. The scenes draw nothing, and the test stays quiet.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('opening sequence', () => {
  it('starts on the PLAY screen with the world not mounted', () => {
    renderApp();
    expect(screen.getByRole('button', { name: /PLAY/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ESPAÑOL' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'ENGLISH' }).getAttribute('aria-pressed')).toBe('false');
    expect(world.inputEnabled).toBeUndefined();
  });

  it('switches the cover language before starting the run', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'ENGLISH' }));
    expect(screen.getByText('Some memories should stay forgotten.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ENGLISH' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('advances warm memory, electric cut and wake-up on its own timers', () => {
    vi.useFakeTimers();
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /PLAY/ }));
    expect(screen.getByLabelText(/REC/)).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(document.querySelector('.intro-sequence--1')).not.toBeNull();
    expect(screen.queryByLabelText(/REC/)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(2200);
    });
    expect(screen.getByText(/¿Dónde estoy/)).toBeTruthy();
    expect(world.inputEnabled).toBe(false);

    act(() => {
      vi.advanceTimersByTime(3800);
    });
    expect(world.inputEnabled).toBe(true);
    expect(savedState().introCompleted).toBe(true);
  });

  it('lets the Skip button end the opening with a click', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /PLAY/ }));
    fireEvent.click(screen.getByRole('button', { name: /Saltar/ }));
    expect(world.inputEnabled).toBe(true);
    expect(savedState().introCompleted).toBe(true);
  });

  it('moves focus to the world once the opening ends', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /PLAY/ }));
    fireEvent.click(screen.getByRole('button', { name: /Saltar/ }));
    expect(document.activeElement).toBe(document.querySelector('.world-wrapper'));
  });
});

describe('VHS shelf and Archive 09', () => {
  it('offers the first tape on the shelf and plays it straight away when taken', () => {
    seedRun();
    renderApp();
    fireEvent.click(screen.getByText('stub-vhs'));
    fireEvent.click(screen.getByRole('button', { name: /Recoger y reproducir: Cinta 01/ }));
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('Platina VHS');
    expect(savedState().collectedTapes).toEqual([FIRST_TAPE_ID]);
  });

  it('keeps Archive 09 off the shelf until every clue and cabinet is done', () => {
    seedRun({
      collectedTapes: [FIRST_TAPE_ID],
      discoveredClues: [FIRST_CLUE_ID],
      completedArcades: [SNAKE_GAME_ID],
    });
    renderApp();
    fireEvent.click(screen.getByText('stub-vhs'));
    expect(screen.getByRole('button', { name: /Recoger y reproducir: Cinta 02/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Reproducir Archivo 09/ })).toBeNull();
  });

  it('offers Archive 09 once the whole story is done', () => {
    completedStory({ restored: false, photos: false, box: false });
    renderApp();
    fireEvent.click(screen.getByText('stub-vhs'));
    expect(screen.getByRole('button', { name: /Reproducir Archivo 09/ })).toBeTruthy();
  });

  it('closes an arcade with Escape and returns focus to the world', () => {
    seedRun({ collectedTapes: [FIRST_TAPE_ID], discoveredClues: [FIRST_CLUE_ID] });
    renderApp();
    fireEvent.click(screen.getByText('stub-arcade'));
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('Recreativas');
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(document.querySelector('.world-wrapper'));
  });
});

describe('endings, Final 3 and the member card', () => {
  it('lists the secret ending as locked with readable missing items, never raw ids', () => {
    completedStory({ photos: false, box: false });
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Ver finales/ }));
    const locked = document.querySelector('.ending__choice--locked')?.textContent ?? '';
    expect(locked).toContain('3 Polaroids an\u00f3malas (0/3)');
    expect(locked).toContain('Caja de Julian y Maya');
    expect(locked).not.toMatch(/tape-00\d/);
    expect(locked).not.toMatch(/julian-maya-box/);
  });

  it('keeps the chosen scene on screen until the player continues to the card', () => {
    completedStory({ photos: false, box: false });
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Ver finales/ }));
    fireEvent.click(screen.getByRole('button', { name: /Liberar recuerdos/ }));
    expect(screen.getByRole('heading', { name: 'El primer viernes' })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Credencial de socio' })).toBeNull();
    expect(savedState().chosenEnding).toBe('bittersweet-dawn');

    fireEvent.click(screen.getByRole('button', { name: 'Continuar a la credencial' }));
    expect(screen.getByRole('dialog', { name: 'Credencial de socio' })).toBeTruthy();
  });

  it('unlocks Final 3 only with the box and three Polaroids, and titles the card for it', () => {
    completedStory();
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Ver finales/ }));
    fireEvent.click(screen.getByRole('button', { name: /Ver el último fotograma/ }));
    expect(screen.getByRole('heading', { name: 'El recuerdo que vive' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a la credencial' }));
    expect(document.querySelector('.member-card__title')?.textContent).toContain('Archivista Implacable');
    expect(savedState().chosenEnding).toBe('archivists-truth');
  });

  it('keeps a way back to the card after Escape, and a POWER button next to it', () => {
    seedRun(finishedRun());
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Credencial de socio/ }));
    expect(screen.getByRole('dialog', { name: 'Credencial de socio' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Credencial de socio' })).toBeNull();
    expect(screen.getByRole('button', { name: /POWER/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Credencial de socio/ }));
    expect(screen.getByRole('dialog', { name: 'Credencial de socio' })).toBeTruthy();
  });
});

/** A finished run: the secret ending was chosen and the timestamps are set. */
function finishedRun(): Record<string, unknown> {
  return {
    collectedTapes: TAPES,
    discoveredClues: CLUES,
    completedArcades: GAMES,
    restoredMemories: [MEMORY_ID],
    capturedPhotos: PHOTOS,
    collectedSecrets: [SECRET_BOX_ID],
    calendarDate: '31-09-98',
    chosenEnding: 'archivists-truth',
    startedAt: 1_000,
    finishedAt: 91_000,
  };
}

describe('power off and reset', () => {
  it('runs the shutdown and returns to the PLAY screen', () => {
    vi.useFakeTimers();
    seedRun(finishedRun());
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Credencial de socio/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Apagar televisor' }));
    expect(document.querySelector('.crt-shutdown')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.getByRole('button', { name: /PLAY/ })).toBeTruthy();
    expect(savedState().introCompleted).toBe(false);
    expect(savedState().chosenEnding).toBeNull();
  });

  it('asks for confirmation before a reset, and cancelling keeps the run', () => {
    seedRun({ collectedTapes: [FIRST_TAPE_ID], discoveredClues: [FIRST_CLUE_ID] });
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Reiniciar/ }));
    expect(screen.getByText(/Borrar esta partida/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText(/Borrar esta partida/)).toBeNull();
    expect(savedState().collectedTapes).toEqual([FIRST_TAPE_ID]);
  });

  it('starts a clean run after the confirmed reset', () => {
    seedRun({ collectedTapes: [FIRST_TAPE_ID], discoveredClues: [FIRST_CLUE_ID] });
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Reiniciar/ }));
    fireEvent.click(screen.getByRole('button', { name: 'S\u00ed, reiniciar' }));
    expect(screen.getByRole('button', { name: /PLAY/ })).toBeTruthy();
    expect(savedState().collectedTapes).toEqual([]);
  });

  it('resets immediately when the page is opened with ?reset=1', () => {
    seedRun({ collectedTapes: [FIRST_TAPE_ID], discoveredClues: [FIRST_CLUE_ID] });
    window.history.replaceState({}, '', '/?reset=1');
    renderApp();
    expect(screen.getByRole('button', { name: /PLAY/ })).toBeTruthy();
    expect(savedState().collectedTapes).toEqual([]);
    window.history.replaceState({}, '', '/');
  });
});
