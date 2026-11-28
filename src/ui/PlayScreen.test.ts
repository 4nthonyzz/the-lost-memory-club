// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayScreen } from './PlayScreen';

afterEach(() => {
  cleanup();
});

describe('PlayScreen language selector', () => {
  it('shows the selected language and exposes accessible ES/EN controls', () => {
    const onLanguageChange = vi.fn();
    render(createElement(PlayScreen, { language: 'es', reducedDistortion: true, onPlay: vi.fn(), onLanguageChange }));
    expect(screen.getByRole('button', { name: 'ESPAÑOL' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'ENGLISH' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: /PLAY/ })).toBeTruthy();
    expect(screen.getByText('Haz clic o pulsa Enter / Espacio')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'ENGLISH' }));
    expect(onLanguageChange).toHaveBeenCalledWith('en');
  });

  it('updates the cover copy when rendered in English', () => {
    render(createElement(PlayScreen, { language: 'en', reducedDistortion: true, onPlay: vi.fn(), onLanguageChange: vi.fn() }));
    expect(screen.getByText('Some memories should stay forgotten.')).toBeTruthy();
    expect(screen.getByText('Click or press Enter / Space')).toBeTruthy();
  });
});
