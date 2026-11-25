import { describe, expect, it } from 'vitest';
import { ARCHIVE_DOCUMENTS, ARCHIVE_FOOTER_HINT, READABLE_COUNT, READABLE_IDS } from './archiveDocuments';

describe('archive documents (task 24.2)', () => {
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

  it('uses the exact footer hint and keeps each card to two to four paragraphs', () => {
    expect(ARCHIVE_FOOTER_HINT).toBe('Press E or move away to close');
    for (const id of READABLE_IDS) {
      const n = ARCHIVE_DOCUMENTS[id].paragraphs.length;
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(4);
      expect(ARCHIVE_DOCUMENTS[id].id).toBe(id);
    }
  });

  it('names no real brand and keeps the text ASCII English', () => {
    const brands = /nintendo|sega|atari|sony|panasonic|pac-?man|blockbuster|jvc|hitachi|namco|capcom|konami|netflix|coca|pepsi/i;
    for (const id of READABLE_IDS) {
      const d = ARCHIVE_DOCUMENTS[id];
      const all = [d.tag, d.title, ...d.paragraphs, d.statusLine ?? ''].join('\n');
      expect(all).not.toMatch(brands);
      // eslint-disable-next-line no-control-regex
      expect(all).toMatch(/^[\x09\x0a\x20-\x7e]*$/);
    }
  });

  it('marks the LAST EXIT and DEAD FREQUENCY cabinets as awaiting service and no other card', () => {
    expect(ARCHIVE_DOCUMENTS['manual-maze'].statusLine).toBe('Cabinet status: awaiting service');
    expect(ARCHIVE_DOCUMENTS['manual-frequency'].statusLine).toBe('Cabinet status: awaiting service');
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
    expect(ARCHIVE_FOOTER_HINT).toBe('Press E or move away to close');
  });

  it('includes the required lore hooks', () => {
    const text = (id: keyof typeof ARCHIVE_DOCUMENTS) => ARCHIVE_DOCUMENTS[id].paragraphs.join(' ');
    expect(text('manual-frequency')).toContain('89.4 MHz');
    expect(text('manual-maze')).toMatch(/three photograph fragments/i);
    expect(text('desk-notebook')).toContain('unlabeled tapes');
  });
});
