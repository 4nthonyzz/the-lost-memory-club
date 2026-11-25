import { describe, expect, it } from 'vitest';
import {
  ARCHIVE_DOCUMENTS,
  ARCHIVE_FOOTER_HINT,
  PAGE_LABELS,
  READABLE_COUNT,
  READABLE_IDS,
  BOOK_SIDE_BY_SIDE_MIN_PX,
  archiveDocumentText,
  isBookDocument,
  isStackedLayout,
} from './archiveDocuments';
import { BOOK_PALETTES, CARD_PALETTES, contrastRatio } from './cardThemes';

/** Raw source of the data module, read as text (no @types/node available). */
const rawSource = (
  import.meta.glob('./archiveDocuments.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
)['./archiveDocuments.ts'];

describe('archive documents (task 24.2, 27.2)', () => {
  it('has exactly the seven readable props with the exact tags and titles', () => {
    expect([...READABLE_IDS]).toEqual(['manual-snake', 'manual-maze', 'manual-frequency', 'desk-notebook', 'cork-board', 'poster-shift', 'poster-archive']);
    expect(Object.keys(ARCHIVE_DOCUMENTS).sort()).toEqual([...READABLE_IDS].sort());
    const pairs = READABLE_IDS.map((id) => [ARCHIVE_DOCUMENTS[id].tag, ARCHIVE_DOCUMENTS[id].title]);
    expect(pairs).toEqual([
      ['ARCADE MANUAL // CABINET 01', 'SNAKE.EXE Manual'],
      ['ARCADE MANUAL // CABINET 02', 'LAST EXIT Manual'],
      ['ARCADE MANUAL // CABINET 03', 'DEAD FREQUENCY Manual'],
      ['TECHNICIAN LOG // NOV 1996', 'Shift Log Notebook'],
      ['EVIDENCE BOARD // INCIDENT REPORT', 'Investigation Pinboard'],
      ['ARCHIVE NOTICE // SIGNAL', 'The Signal Remembers'],
      ['CLUB NOTICE // MEMBERS ARCHIVE', 'Club Archive Notice'],
    ]);
  });

  it('uses the exact footer hint and the two page labels', () => {
    expect(ARCHIVE_FOOTER_HINT).toBe('Press 1 / 2 to switch pages · E or move away to close');
    expect([...PAGE_LABELS]).toEqual(['[1] OVERVIEW & RULES', '[2] TECHNICIAN / ANOMALY LOG']);
  });

  it('gives every document a theme, a status pill, two to four specs and two labelled pages with blocks', () => {
    const themes = READABLE_IDS.map((id) => ARCHIVE_DOCUMENTS[id].theme);
    expect(themes).toEqual(['snake', 'maze', 'frequency', 'notebook', 'board', 'shift', 'notice']);
    for (const id of READABLE_IDS) {
      const d = ARCHIVE_DOCUMENTS[id];
      expect(d.id).toBe(id);
      expect(d.status.length).toBeGreaterThan(0);
      expect(d.accent).toMatch(/^#[0-9a-f]{6}$/);
      expect(d.specs.length).toBeGreaterThanOrEqual(2);
      expect(d.specs.length).toBeLessThanOrEqual(4);
      expect(d.pages).toHaveLength(2);
      expect(d.pages.map((p) => p.label)).toEqual([...PAGE_LABELS]);
      for (const p of d.pages) {
        expect(p.blocks.length).toBeGreaterThanOrEqual(1);
        for (const b of p.blocks) {
          expect(b.heading.length).toBeGreaterThan(0);
          expect(b.lines.length).toBeGreaterThan(0);
        }
      }
      // Every document carries at least one highlighted key clue.
      expect(d.pages.flatMap((p) => p.blocks).some((b) => b.highlight === true)).toBe(true);
    }
  });

  it('uses the exact accents, status pills and page 1 block headings of the three cabinets', () => {
    const headings = (id: keyof typeof ARCHIVE_DOCUMENTS) => ARCHIVE_DOCUMENTS[id].pages[0].blocks.map((b) => b.heading);
    expect(ARCHIVE_DOCUMENTS['manual-snake'].status).toBe('CABINET 01 // PLAYABLE');
    expect(ARCHIVE_DOCUMENTS['manual-snake'].accent).toBe('#22c55e');
    expect(headings('manual-snake')).toEqual(['OBJECTIVE', 'CONTROLS', 'SHADOW ANOMALY']);
    expect(ARCHIVE_DOCUMENTS['manual-maze'].status).toBe('CABINET 02 // MAINTENANCE LOCKOUT');
    expect(ARCHIVE_DOCUMENTS['manual-maze'].accent).toBe('#f43f5e');
    expect(headings('manual-maze')).toEqual(['OBJECTIVE', 'CONTROLS', 'ENTITY HAZARD']);
    expect(ARCHIVE_DOCUMENTS['manual-frequency'].status).toBe('CABINET 03 // SIGNAL ANOMALY');
    expect(ARCHIVE_DOCUMENTS['manual-frequency'].accent).toBe('#f59e0b');
    expect(headings('manual-frequency')).toEqual(['OBJECTIVE', 'CONTROLS', 'TUNING PROTOCOL']);
  });

  it('names no real brand, keeps the text ASCII English and never reveals a real code', () => {
    const brands = /nintendo|sega|atari|sony|panasonic|pac-?man|blockbuster|jvc|hitachi|namco|capcom|konami|netflix|coca|pepsi/i;
    for (const id of READABLE_IDS) {
      const all = archiveDocumentText(ARCHIVE_DOCUMENTS[id]);
      expect(all).not.toMatch(brands);
      // eslint-disable-next-line no-control-regex
      expect(all).toMatch(/^[\x09\x0a\x20-\x7e]*$/);
    }
    // The hidden-code hint carries no digit sequence that could be a code.
    const hint = ARCHIVE_DOCUMENTS['manual-snake'].pages[1].blocks.map((b) => b.lines.join(' ')).join(' ');
    expect(hint).not.toMatch(/\d/);
  });

  it('marks the LAST EXIT and DEAD FREQUENCY cabinets as awaiting service and no other card', () => {
    expect(ARCHIVE_DOCUMENTS['manual-maze'].statusLine).toBe('Cabinet status: awaiting service');
    expect(ARCHIVE_DOCUMENTS['manual-frequency'].statusLine).toBe('Cabinet status: awaiting service');
    expect(archiveDocumentText(ARCHIVE_DOCUMENTS['manual-maze'])).toContain('awaiting service');
    expect(archiveDocumentText(ARCHIVE_DOCUMENTS['manual-frequency'])).toContain('awaiting service');
    expect(ARCHIVE_DOCUMENTS['manual-snake'].statusLine).toBeUndefined();
  });

  it('25.2: has seven entries, the Club Archive Notice has the exact tag and title and no status line', () => {
    expect(READABLE_IDS).toHaveLength(7);
    expect(READABLE_COUNT).toBe(7);
    expect(Object.keys(ARCHIVE_DOCUMENTS)).toHaveLength(7);
    const d = ARCHIVE_DOCUMENTS['poster-archive'];
    expect(d.tag).toBe('CLUB NOTICE // MEMBERS ARCHIVE');
    expect(d.title).toBe('Club Archive Notice');
    expect(d.statusLine).toBeUndefined();
  });

  it('includes the required lore hooks', () => {
    const text = (id: keyof typeof ARCHIVE_DOCUMENTS) => archiveDocumentText(ARCHIVE_DOCUMENTS[id]);
    expect(text('manual-frequency')).toContain('89.4 MHz');
    const tuning = ARCHIVE_DOCUMENTS['manual-frequency'].pages[0].blocks.find((b) => b.heading === 'TUNING PROTOCOL');
    expect(tuning?.lines.join(' ')).toContain('89.4 MHz');
    expect(text('manual-maze')).toMatch(/three photograph fragments/i);
    expect(text('desk-notebook')).toContain('unlabeled tapes');
    expect(text('poster-shift')).toContain('PLEASE REWIND. THE TAPE REMEMBERS YOU.');
  });

  it('keeps every placeholder-lore review comment in the source', () => {
    const marker = 'placeholder lore for review by the story owner (Developer 3)';
    // One in the file header and one before each of the seven documents.
    expect(rawSource.split(marker).length - 1).toBeGreaterThanOrEqual(1 + READABLE_COUNT);
  });

  it('keeps text contrast of at least 4.5:1 on every theme surface', () => {
    for (const id of READABLE_IDS) {
      const d = ARCHIVE_DOCUMENTS[id];
      const p = CARD_PALETTES[d.theme];
      const pairs: Array<[string, string, string]> = [
        ['ink/bg', p.ink, p.bg],
        ['muted/bg', p.muted, p.bg],
        ['accent/bg', d.accent, p.bg],
        ['bg/accent (active tab)', p.bg, d.accent],
        ['pillInk/pillBg', p.pillInk, p.pillBg],
        ['ink/hlBg', p.ink, p.hlBg],
        ['accent/hlBg', d.accent, p.hlBg],
      ];
      for (const [name, a, b] of pairs) {
        expect(contrastRatio(a, b), `${d.theme} ${name}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe('open-book manuals (task 29.1)', () => {
  it('flags the three manuals as book documents and the four room clues as not', () => {
    for (const id of ['manual-snake', 'manual-maze', 'manual-frequency'] as const) {
      expect(isBookDocument(ARCHIVE_DOCUMENTS[id]), id).toBe(true);
    }
    for (const id of ['desk-notebook', 'cork-board', 'poster-shift', 'poster-archive'] as const) {
      expect(isBookDocument(ARCHIVE_DOCUMENTS[id]), id).toBe(false);
    }
  });

  it('isStackedLayout stacks below the breakpoint and treats an unknown width as wide', () => {
    expect(isStackedLayout(BOOK_SIDE_BY_SIDE_MIN_PX - 1)).toBe(true);
    expect(isStackedLayout(BOOK_SIDE_BY_SIDE_MIN_PX)).toBe(false);
    expect(isStackedLayout(1200)).toBe(false);
    expect(isStackedLayout(0)).toBe(false);
    expect(isStackedLayout(null)).toBe(false);
    expect(isStackedLayout(undefined)).toBe(false);
  });

  it('keeps text contrast of at least 4.5:1 on the book page paper', () => {
    for (const theme of ['snake', 'maze', 'frequency'] as const) {
      const p = BOOK_PALETTES[theme];
      const pairs: Array<[string, string, string]> = [
        ['ink/page', p.pageInk, p.pageBg],
        ['muted/page', p.pageMuted, p.pageBg],
        ['accentInk/page', p.pageAccentInk, p.pageBg],
        ['ink/highlight', p.pageInk, p.pageHlBg],
        ['accentInk/highlight', p.pageAccentInk, p.pageHlBg],
      ];
      for (const [name, a, b] of pairs) {
        expect(contrastRatio(a, b), `${theme} ${name}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
