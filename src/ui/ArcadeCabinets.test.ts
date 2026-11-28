// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEAD_FREQUENCY_GAME_ID, SHADOW_FIGHT_GAME_ID, SNAKE_GAME_ID } from '../core/contracts';
import { DEMO_ARCADE_SCORE } from '../memories/session';
import { ArcadeCabinets } from './ArcadeCabinets';

function renderCabinets(props: Partial<Parameters<typeof ArcadeCabinets>[0]> = {}) {
  const onWin = vi.fn();
  const onClose = vi.fn();
  render(
    createElement(ArcadeCabinets, {
      language: 'en',
      unlocked: [SNAKE_GAME_ID],
      completed: [],
      allowSimulation: false,
      onWin,
      onClose,
      ...props,
    }),
  );
  return { onWin, onClose };
}

afterEach(() => {
  cleanup();
});

describe('arcade cabinets', () => {
  it('lists the three cabinets and explains why the locked ones are closed', () => {
    renderCabinets();
    expect(screen.getByText('SNAKE.EXE')).toBeTruthy();
    expect(screen.getByText('Locked: find the clue on tape 02 first.')).toBeTruthy();
    expect(screen.getByText('Locked: find the clue on tape 03 first.')).toBeTruthy();
    const playButtons = screen.getAllByRole('button', { name: 'Play' });
    expect((playButtons[0] as HTMLButtonElement).disabled).toBe(false);
    expect((playButtons[1] as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the quick win only when simulation is allowed, and reports the real game id', () => {
    const { onWin } = renderCabinets({ unlocked: [SNAKE_GAME_ID, SHADOW_FIGHT_GAME_ID], allowSimulation: true });
    expect(screen.getAllByRole('button', { name: /Quick win/ })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: /Quick win/ })[1]!);
    expect(onWin).toHaveBeenCalledWith(SHADOW_FIGHT_GAME_ID, DEMO_ARCADE_SCORE);
  });

  it('hides the quick win in production', () => {
    renderCabinets({ allowSimulation: false });
    expect(screen.queryByRole('button', { name: /Quick win/ })).toBeNull();
  });

  it('closes with Escape from the cabinet list', () => {
    const { onClose } = renderCabinets();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens the playable game of the chosen cabinet and returns to the list with the back button', () => {
    renderCabinets({ unlocked: [SNAKE_GAME_ID, DEAD_FREQUENCY_GAME_ID], completed: [] });
    fireEvent.click(screen.getAllByRole('button', { name: 'Play' })[0]!);
    expect(screen.getByText('SNAKE.EXE')).toBeTruthy();
    expect(document.querySelector('.snake-board')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the cabinets' }));
    expect(screen.getByText('Arcade cabinets')).toBeTruthy();
  });
});
