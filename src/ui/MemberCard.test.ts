// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemberCard } from './MemberCard';

function renderCard(props: Partial<Parameters<typeof MemberCard>[0]> = {}) {
  const onPower = vi.fn();
  const onClose = vi.fn();
  render(
    createElement(MemberCard, {
      language: 'en',
      titleKey: 'relentless-archivist',
      polaroidCount: 2,
      arcadeCount: 3,
      playSeconds: 90,
      onPower,
      onClose,
      ...props,
    }),
  );
  return { onPower, onClose };
}

afterEach(() => {
  cleanup();
});

describe('MemberCard', () => {
  it('shows the dynamic title, the counts and the run time from the start of the run', () => {
    renderCard();
    expect(document.querySelector('.member-card__title')?.textContent).toContain('Relentless Archivist');
    expect(document.querySelector('.member-card__stats')?.textContent).toContain('2/3');
    expect(document.querySelector('.member-card__stats')?.textContent).toContain('3/3');
    expect(document.querySelector('.member-card__stats')?.textContent).toContain('1:30');
  });

  it('shows a placeholder when the run time is unknown', () => {
    renderCard({ playSeconds: null, titleKey: null });
    expect(document.querySelector('.member-card__stats')?.textContent).toContain('--:--');
    expect(document.querySelector('.member-card__title')?.textContent).toBe('');
  });

  it('reports power off and close separately', () => {
    const { onPower, onClose } = renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Power off TV' }));
    expect(onPower).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Close card' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses Spanish copy when asked', () => {
    renderCard({ language: 'es', titleKey: 'first-friday' });
    expect(document.querySelector('.member-card__title')?.textContent).toContain('El Primer Viernes');
    expect(screen.getByRole('button', { name: 'Cerrar credencial' })).toBeTruthy();
  });
});
