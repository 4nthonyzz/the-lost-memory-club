// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IntroSequence } from './IntroSequence';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('IntroSequence', () => {
  it('renders a labelled CRT canvas and the warm memory phase', () => {
    render(createElement(IntroSequence, { phase: 0, language: 'es', reducedDistortion: false, onSkip: vi.fn() }));
    expect(document.querySelector('.intro-sequence__canvas')).not.toBeNull();
    expect(screen.getByRole('img', { name: /REC/ })).toBeTruthy();
  });

  it('renders the wake subtitle and guide pulse in both languages', () => {
    const onSkip = vi.fn();
    render(createElement(IntroSequence, { phase: 2, language: 'en', reducedDistortion: true, onSkip }));
    expect(screen.getByText(/Where am I/)).toBeTruthy();
    expect(screen.getByText('The television is waiting at the counter.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Skip/ }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
