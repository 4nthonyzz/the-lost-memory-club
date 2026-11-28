// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EndingScreen } from './EndingScreen';
import type { EndingView } from './viewModels';

const endings: EndingView[] = [
  { id: 'bittersweet-dawn', title: 'The First Friday', choiceLabel: 'Release Memories', text: 'Morning light cuts through the shop.' },
  { id: 'archivists-truth', title: 'The Memory That Lives', choiceLabel: 'Watch the Last Frame', text: 'The final frame holds still.' },
];

function renderScreen(props: Partial<Parameters<typeof EndingScreen>[0]> = {}) {
  const onChosen = vi.fn();
  const onFinish = vi.fn();
  render(
    createElement(EndingScreen, {
      language: 'en',
      reducedDistortion: true,
      endings,
      chosenId: null,
      secretMissing: [],
      onChosen,
      onFinish,
      ...props,
    }),
  );
  return { onChosen, onFinish };
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('EndingScreen choice', () => {
  it('lists the unlocked endings and reports the chosen one', () => {
    const { onChosen, onFinish } = renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Watch the Last Frame/ }));
    expect(onChosen).toHaveBeenCalledWith('archivists-truth');
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('shows the readable missing items of the locked secret ending', () => {
    renderScreen({ secretMissing: ["Julian and Maya\u2019s box", '3 anomalous Polaroids (1/3)'] });
    const locked = document.querySelector('.ending__choice--locked')?.textContent ?? '';
    expect(locked).toContain("Missing: Julian and Maya\u2019s box, 3 anomalous Polaroids (1/3)");
  });

  it('explains that nothing is unlocked yet when the list is empty', () => {
    renderScreen({ endings: [] });
    expect(screen.getByText('Restore Archive 09 to reach the ending.')).toBeTruthy();
  });
});

describe('EndingScreen chosen scene', () => {
  it('keeps the chosen scene on screen until the player continues', () => {
    const { onFinish } = renderScreen({ chosenId: 'bittersweet-dawn' });
    expect(screen.getByRole('heading', { name: 'The First Friday' })).toBeTruthy();
    expect(screen.getByText('Morning light cuts through the shop.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Release Memories/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to the member card' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('falls back to the choice list when the chosen id is not unlocked', () => {
    renderScreen({ chosenId: 'forever-1998' });
    expect(screen.getByRole('button', { name: /Release Memories/ })).toBeTruthy();
  });
});
