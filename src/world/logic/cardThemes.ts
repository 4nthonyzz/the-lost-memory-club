// Pure data module: surface colours of each Archive Document Card theme. The card sets them as CSS custom
// properties, and a test checks the text contrast of every pair (>= 4.5:1).
import type { DocTheme } from './archiveDocuments';

export interface CardPalette {
  /** Card surface. */
  bg: string;
  /** Body text on the surface. */
  ink: string;
  /** Secondary text (tag, footer) on the surface. */
  muted: string;
  /** Pill background and pill text. */
  pillBg: string;
  pillInk: string;
  /** Background of highlighted blocks. */
  hlBg: string;
}

export const CARD_PALETTES: Readonly<Record<DocTheme, CardPalette>> = Object.freeze({
  snake: { bg: '#07130c', ink: '#d1fae5', muted: '#86efac', pillBg: '#0f2a1a', pillInk: '#bbf7d0', hlBg: '#0c2a18' },
  maze: { bg: '#13060a', ink: '#ffe4e6', muted: '#fda4af', pillBg: '#2a0a12', pillInk: '#fecdd3', hlBg: '#2b0b14' },
  frequency: { bg: '#140e03', ink: '#fef3c7', muted: '#fcd34d', pillBg: '#2a1d05', pillInk: '#fde68a', hlBg: '#2e2006' },
  notebook: { bg: '#f4edd6', ink: '#1f2937', muted: '#4b5563', pillBg: '#dbe4f3', pillInk: '#1e3a8a', hlBg: '#fff3a8' },
  board: { bg: '#e6cf9c', ink: '#1c1408', muted: '#4a3410', pillBg: '#f5e9c8', pillInk: '#5b1212', hlBg: '#f8e7b0' },
  shift: { bg: '#0a0e1f', ink: '#e0f2fe', muted: '#7dd3fc', pillBg: '#1a1f3d', pillInk: '#a5f3fc', hlBg: '#1b1440' },
  notice: { bg: '#e9e4d0', ink: '#1c1917', muted: '#44403c', pillBg: '#d6cfb4', pillInk: '#3b2a14', hlBg: '#f3ecc0' },
});

/**
 * Turntable catalog card (task 33.3): a 1990s Hi-Fi look. Dark walnut surface with amber LCD text; the active track row
 * sits on an emerald panel (hlBg) and keeps `ink` text. `frame` and `accent` are decorative only (borders, metal trim).
 */
export const TURNTABLE_PALETTE: CardPalette & { frame: string; accent: string; lcdBg: string; lcdInk: string; lcdActiveInk: string } =
  Object.freeze({
    bg: '#1c120a',
    ink: '#ffd479',
    muted: '#d8c3a0',
    pillBg: '#2b1b0f',
    pillInk: '#a7f3d0',
    hlBg: '#0f3d2e',
    frame: '#9ca3af',
    accent: '#c0c6cf',
    lcdBg: '#0b0f0c',
    lcdInk: '#ffc24a',
    lcdActiveInk: '#b9f6d6',
  });

/** Printed-paper colours of the open-book pages (manual themes only). */
export interface BookPalette {
  /** Paper tint. */
  pageBg: string;
  /** Body text on the paper. */
  pageInk: string;
  /** Secondary text (page numbers) on the paper. */
  pageMuted: string;
  /** Highlighted block background on the paper. */
  pageHlBg: string;
  /** Darkened accent used for text (block titles, status line) on the paper and on highlighted blocks. */
  pageAccentInk: string;
}

export const BOOK_PALETTES: Readonly<Record<'snake' | 'maze' | 'frequency', BookPalette>> = Object.freeze({
  snake: { pageBg: '#e8f1e4', pageInk: '#10220f', pageMuted: '#3b4f38', pageHlBg: '#cfe8c6', pageAccentInk: '#166534' },
  maze: { pageBg: '#f3e6e6', pageInk: '#2a0a12', pageMuted: '#5a3a40', pageHlBg: '#f1cfd5', pageAccentInk: '#9f1239' },
  frequency: { pageBg: '#f6ecd2', pageInk: '#2b1d03', pageMuted: '#5c4513', pageHlBg: '#f2dfa6', pageAccentInk: '#92400e' },
});

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG contrast ratio of two #rrggbb colours. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
