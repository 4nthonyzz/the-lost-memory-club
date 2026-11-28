// @vitest-environment jsdom
import { createElement } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTION_CUTSCENE_MS, ActionCutscene } from './ActionCutscene';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ActionCutscene', () => {
  it('shows the tape insertion cut with its readable label and allows skipping', () => {
    const onDone = vi.fn();
    render(createElement(ActionCutscene, {
      kind: 'insert-tape', language: 'es', reducedDistortion: false, label: 'CINTA 02', onDone,
    }));
    expect(screen.getByText('INSERTANDO CINTA')).toBeTruthy();
    expect(screen.getByText('CINTA 02')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Saltar animación' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('shows the Polaroid-to-arcade signal in English', () => {
    render(createElement(ActionCutscene, {
      kind: 'clue-to-arcade', language: 'en', reducedDistortion: false, machine: 'SNAKE.EXE', onDone: vi.fn(),
    }));
    expect(screen.getByText('Signal detected in SNAKE.EXE')).toBeTruthy();
  });

  it('shows the coin insert transition and finishes after 1.1 seconds', () => {
    const onDone = vi.fn();
    render(createElement(ActionCutscene, {
      kind: 'insert-coin', language: 'es', reducedDistortion: false, machine: 'LAST EXIT / SHADOW FIGHT', onDone,
    }));
    expect(screen.getByText('INSERTA FICHA · LAST EXIT / SHADOW FIGHT')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(ACTION_CUTSCENE_MS - 1);
    });
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('omits the animation immediately when reduced distortion is enabled', () => {
    const onDone = vi.fn();
    const { container } = render(createElement(ActionCutscene, {
      kind: 'insert-coin', language: 'es', reducedDistortion: true, machine: 'SNAKE.EXE', onDone,
    }));
    expect(container.firstChild).toBeNull();
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
