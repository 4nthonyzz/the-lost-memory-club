// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FIRST_TAPE_ID, SECOND_TAPE_ID } from '../core/contracts';
import type { DeckOption } from '../memories/storyFlow';
import { TapeShelf } from './TapeShelf';

const options: DeckOption[] = [
  { kind: 'pickup', tapeId: SECOND_TAPE_ID },
  { kind: 'replay', tapeId: FIRST_TAPE_ID },
];

function renderShelf(list: DeckOption[] = options, capturedPhotos: readonly string[] = []) {
  const onPick = vi.fn();
  const onClose = vi.fn();
  render(createElement(TapeShelf, { language: 'en', options: list, capturedPhotos, onPick, onClose }));
  return { onPick, onClose };
}

afterEach(() => {
  cleanup();
});

describe('TapeShelf', () => {
  it('lists the new tape and the replay with readable tape labels', () => {
    renderShelf();
    expect(screen.getByRole('button', { name: /Take and play: Tape 02/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Watch again: Tape 01/ })).toBeTruthy();
  });

  it('shows the captured Polaroid badge beside a replay and the pending hint otherwise', () => {
    renderShelf([
      { kind: 'replay', tapeId: FIRST_TAPE_ID },
      { kind: 'replay', tapeId: SECOND_TAPE_ID },
    ], [`${FIRST_TAPE_ID}:${FIRST_TAPE_ID}-memory`]);
    expect(screen.getByText('★ Polaroid captured')).toBeTruthy();
    expect(screen.getByText(/Polaroid pending/)).toBeTruthy();
  });

  it('takes the option with a click', () => {
    const { onPick } = renderShelf();
    fireEvent.click(screen.getByRole('button', { name: /Take and play: Tape 02/ }));
    expect(onPick).toHaveBeenCalledWith({ kind: 'pickup', tapeId: SECOND_TAPE_ID });
  });

  it('takes the first new item with E, and ignores replays', () => {
    const { onPick } = renderShelf([{ kind: 'replay', tapeId: FIRST_TAPE_ID }, { kind: 'box' }]);
    fireEvent.keyDown(document.activeElement!, { key: 'e' });
    expect(onPick).toHaveBeenCalledWith({ kind: 'box' });
  });

  it('does nothing on E when only replays are left', () => {
    const { onPick } = renderShelf([{ kind: 'replay', tapeId: FIRST_TAPE_ID }]);
    fireEvent.keyDown(document.activeElement!, { key: 'e' });
    expect(onPick).not.toHaveBeenCalled();
  });

  it('says so when nothing is on the shelf', () => {
    renderShelf([]);
    expect(screen.getByText('Nothing to play yet.')).toBeTruthy();
  });

  it('closes from its button', () => {
    const { onClose } = renderShelf();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
