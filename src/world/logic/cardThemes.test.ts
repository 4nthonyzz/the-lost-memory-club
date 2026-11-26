import { describe, expect, it } from 'vitest';
import { TURNTABLE_PALETTE, contrastRatio } from './cardThemes';

describe('turntable card palette (task 33.3)', () => {
  it('every text pair has a contrast of at least 4.5:1', () => {
    const p = TURNTABLE_PALETTE;
    const pairs: Array<[string, string, string]> = [
      ['ink/bg', p.ink, p.bg],
      ['muted/bg', p.muted, p.bg],
      ['pillInk/pillBg', p.pillInk, p.pillBg],
      ['lcdInk/lcdBg', p.lcdInk, p.lcdBg],
      ['lcdActiveInk/hlBg', p.lcdActiveInk, p.hlBg],
      ['ink/hlBg', p.ink, p.hlBg],
    ];
    for (const [name, fg, bg] of pairs) expect({ name, ratio: contrastRatio(fg, bg) >= 4.5 }).toEqual({ name, ratio: true });
  });
});