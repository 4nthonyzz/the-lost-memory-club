// Pure data module: the Archive Document Card contents of the readable world props.
// All text is original and in English. No real brands, people or third-party material.
// Every entry below is placeholder lore for review by the story owner (Developer 3).
import type { ReadableId } from '../worldTypes';

/** Visual theme of a card. The overlay maps it to a data-theme attribute, CSS and an inline SVG header. */
export type DocTheme = 'snake' | 'maze' | 'frequency' | 'notebook' | 'board' | 'shift' | 'notice';

/** A titled block of text inside a page. Highlighted blocks carry the key clues. */
export interface DocBlock {
  heading: string;
  lines: readonly string[];
  highlight?: boolean;
}

export interface DocPage {
  /** Tab label. */
  label: string;
  blocks: readonly DocBlock[];
}

export interface DocSpec {
  label: string;
  value: string;
}

export interface ArchiveDocument {
  id: ReadableId;
  /** Category tag line, shown above the title. */
  tag: string;
  title: string;
  theme: DocTheme;
  /** Accent colour of the theme (hex). */
  accent: string;
  /** Status pill text. */
  status: string;
  /** Two to four telemetry / spec pills. */
  specs: readonly DocSpec[];
  /** Page 1 is the overview and rules, page 2 the technician / anomaly log. */
  pages: readonly [DocPage, DocPage];
  /** Optional small diegetic line, used by cabinets whose game is not in service. */
  statusLine?: string;
}

export type CardPage = 1 | 2;

export const PAGE_LABELS: readonly [string, string] = ['[1] OVERVIEW & RULES', '[2] TECHNICIAN / ANOMALY LOG'];

/** Footer hint shown at the bottom of every card. */
export const ARCHIVE_FOOTER_HINT = 'Press 1 / 2 to switch pages · E or move away to close';

/** Status line of the cabinets whose games are not playable yet. */
export const CABINET_AWAITING_SERVICE = 'Cabinet status: awaiting service';

export const READABLE_IDS: readonly ReadableId[] = Object.freeze([
  'manual-snake',
  'manual-maze',
  'manual-frequency',
  'desk-notebook',
  'cork-board',
  'poster-shift',
  'poster-archive',
]);

/** Number of readable documents: the denominator of the notes counter. */
export const READABLE_COUNT = READABLE_IDS.length;

/** Manual documents render as an open two-page book; the four room clues keep their single-page tabbed layout. */
const BOOK_THEMES: readonly DocTheme[] = ['snake', 'maze', 'frequency'];

export function isBookDocument(doc: Pick<ArchiveDocument, 'theme'>): boolean {
  return BOOK_THEMES.includes(doc.theme);
}

/** Printed page headings of the open-book layout (page 1 left, page 2 right). */
export const BOOK_PAGE_HEADINGS: readonly [string, string] = ['PAGE 01 // OVERVIEW & RULES', 'PAGE 02 // TECHNICIAN / ANOMALY LOG'];

/** Printed page numbers of the open-book layout. */
export const BOOK_PAGE_NUMBERS: readonly [string, string] = ['P. 01', 'P. 02'];

/** Decorative archive imprint stamped on the book. */
export const BOOK_STAMP_TEXT = 'LOST MEMORY CLUB // ARCHIVE COPY';

/**
 * Minimum content width (CSS px) of the card at which the two pages sit side by side. The stylesheet uses the same
 * value in its container query (and a viewport media query as fallback); keep both in step.
 */
export const BOOK_SIDE_BY_SIDE_MIN_PX = 640;

/** True when the book pages are stacked for a card of the given content width. An unknown width counts as wide. */
export function isStackedLayout(width: number | null | undefined): boolean {
  return typeof width === 'number' && width > 0 && width < BOOK_SIDE_BY_SIDE_MIN_PX;
}

export function isReadableId(id: string): id is ReadableId {
  return (READABLE_IDS as readonly string[]).includes(id);
}

/** All visible text of a document, joined by newlines. Used by tests and text checks. */
export function archiveDocumentText(d: ArchiveDocument): string {
  const parts: string[] = [d.tag, d.title, d.status, d.statusLine ?? ''];
  for (const s of d.specs) parts.push(s.label, s.value);
  for (const p of d.pages) {
    parts.push(p.label);
    for (const b of p.blocks) parts.push(b.heading, ...b.lines);
  }
  return parts.join('\n');
}

export const ARCHIVE_DOCUMENTS: Readonly<Record<ReadableId, ArchiveDocument>> = Object.freeze({
  // placeholder lore for review by the story owner (Developer 3)
  'manual-snake': {
    id: 'manual-snake',
    tag: 'ARCADE MANUAL // CABINET 01',
    title: 'SNAKE.EXE Manual',
    theme: 'snake',
    accent: '#22c55e',
    // Diegetic text: it is accurate only once the Snake game ships in src/arcade.
    status: 'CABINET 01 // PLAYABLE',
    specs: [
      { label: 'CABINET', value: '01' },
      { label: 'MEDIUM', value: 'VHS TAPE' },
      { label: 'HAZARD', value: 'SHADOW SERPENT' },
    ],
    pages: [
      {
        label: PAGE_LABELS[0],
        blocks: [
          {
            heading: 'OBJECTIVE',
            lines: [
              'Guide the serpent of magnetic VHS tape around the screen.',
              'Collect every tape fragment to lengthen the ribbon.',
            ],
          },
          {
            heading: 'CONTROLS',
            lines: ['Steer the head with the arrow keys or W A S D.', 'Never cross your own tail.'],
          },
          {
            heading: 'SHADOW ANOMALY',
            lines: [
              'WARNING: a shadow serpent, spun from unwound tape, crawls the same board.',
              'If it reaches your head the session ends.',
            ],
            highlight: true,
          },
        ],
      },
      {
        label: PAGE_LABELS[1],
        blocks: [
          {
            heading: 'TECHNICIAN NOTE',
            lines: ['The score screen sometimes flickers a short code before it fades.'],
          },
          {
            heading: 'HIDDEN CODE',
            lines: ['Write it down. It may open something in the archive.', 'It shows only for a moment, so keep a pen ready.'],
            highlight: true,
          },
        ],
      },
    ],
  },
  // placeholder lore for review by the story owner (Developer 3)
  'manual-maze': {
    id: 'manual-maze',
    tag: 'ARCADE MANUAL // CABINET 02',
    title: 'LAST EXIT Manual',
    theme: 'maze',
    accent: '#f43f5e',
    status: 'CABINET 02 // MAINTENANCE LOCKOUT',
    specs: [
      { label: 'CABINET', value: '02' },
      { label: 'FRAGMENTS', value: '3' },
      { label: 'HAZARD', value: 'ENTITY' },
    ],
    pages: [
      {
        label: PAGE_LABELS[0],
        blocks: [
          {
            heading: 'OBJECTIVE',
            lines: [
              'LAST EXIT drops the player into a dark labyrinth whose walls shift while nobody is watching.',
              'Three photograph fragments were lost inside. Recover all three before you look for the exit.',
            ],
            highlight: true,
          },
          {
            heading: 'CONTROLS',
            lines: ['Walk with the arrow keys or W A S D.', 'Do not trust a corridor you have already walked.'],
          },
          {
            heading: 'ENTITY HAZARD',
            lines: [
              'Something walks the corridors. It never runs and it never stops.',
              'If you hear it behind you, turn the nearest corner.',
            ],
          },
        ],
      },
      {
        label: PAGE_LABELS[1],
        blocks: [
          {
            heading: 'TECHNICIAN LOG',
            lines: ['The coin door is locked out for service. The board has not been repaired since the room changed.'],
          },
          {
            heading: 'ANOMALY',
            lines: ['The corridor in the service photograph does not match the cabinet diagram.'],
            highlight: true,
          },
        ],
      },
    ],
    statusLine: CABINET_AWAITING_SERVICE,
  },
  // placeholder lore for review by the story owner (Developer 3)
  'manual-frequency': {
    id: 'manual-frequency',
    tag: 'ARCADE MANUAL // CABINET 03',
    title: 'DEAD FREQUENCY Manual',
    theme: 'frequency',
    accent: '#f59e0b',
    status: 'CABINET 03 // SIGNAL ANOMALY',
    specs: [
      { label: 'CABINET', value: '03' },
      { label: 'CARRIER', value: '89.4 MHz' },
      { label: 'MODE', value: 'TONE MEMORY' },
    ],
    pages: [
      {
        label: PAGE_LABELS[0],
        blocks: [
          {
            heading: 'OBJECTIVE',
            lines: [
              'DEAD FREQUENCY plays a sequence of radio tones.',
              'Repeat each sequence exactly to decode the transmission that follows.',
            ],
          },
          {
            heading: 'CONTROLS',
            lines: ['Repeat each tone on the cabinet panel, in order.', 'Memory sequences grow longer every round.'],
          },
          {
            heading: 'TUNING PROTOCOL',
            lines: [
              'Listen for the gaps between the tones, because the gaps matter.',
              'Reference carrier: 89.4 MHz.',
            ],
            highlight: true,
          },
        ],
      },
      {
        label: PAGE_LABELS[1],
        blocks: [
          {
            heading: 'ENGINEERING ANOMALY',
            lines: [
              'A carrier appears near 89.4 MHz where no station should be.',
              'We could not trace the source.',
            ],
            highlight: true,
          },
          {
            heading: 'TECHNICIAN NOTE',
            lines: ['The tones do not stop when the cabinet is switched off.'],
          },
        ],
      },
    ],
    statusLine: CABINET_AWAITING_SERVICE,
  },
  // placeholder lore for review by the story owner (Developer 3)
  'desk-notebook': {
    id: 'desk-notebook',
    tag: 'TECHNICIAN LOG // NOV 1996',
    title: 'Shift Log Notebook',
    theme: 'notebook',
    accent: '#1e40af',
    status: 'LOGBOOK // NIGHT SHIFT',
    specs: [
      { label: 'MONTH', value: 'NOV 1996' },
      { label: 'ENTRIES', value: '3' },
      { label: 'SHIFT', value: 'NIGHT' },
    ],
    pages: [
      {
        label: PAGE_LABELS[0],
        blocks: [
          {
            heading: 'NOV 12, 11:40 PM',
            lines: ['Another power surge during the late shift.', 'Every cabinet flickered and the lights sagged for a slow count of three.'],
          },
          {
            heading: 'NOV 13',
            lines: [
              'Found unlabeled tapes on the console this morning. Nobody signed them out.',
              'I locked the cabinet and left a note for the owner.',
            ],
            highlight: true,
          },
          {
            heading: 'NOV 14',
            lines: ['The tapes were back on the console.', '- Club attendant, night shift'],
          },
        ],
      },
      {
        label: PAGE_LABELS[1],
        blocks: [
          {
            heading: 'MARGIN NOTE',
            lines: ['The surges come before the tapes appear, never after.'],
          },
          {
            heading: 'OPEN QUESTION',
            lines: ['Who returns the tapes to the console after the cabinet is locked?'],
            highlight: true,
          },
        ],
      },
    ],
  },
  // placeholder lore for review by the story owner (Developer 3)
  'cork-board': {
    id: 'cork-board',
    tag: 'EVIDENCE BOARD // INCIDENT REPORT',
    title: 'Investigation Pinboard',
    theme: 'board',
    accent: '#991b1b',
    status: 'EVIDENCE FILE // UNRESOLVED',
    specs: [
      { label: 'PHOTOS', value: '3' },
      { label: 'STRING', value: 'RED' },
      { label: 'NOTICE', value: 'UNSIGNED' },
    ],
    pages: [
      {
        label: PAGE_LABELS[0],
        blocks: [
          {
            heading: 'PINNED POLAROIDS',
            lines: [
              'The front desk after closing, a blurred hallway, and an empty chair facing the television.',
              'Each is dated one night apart.',
            ],
          },
          {
            heading: 'RED STRING',
            lines: [
              'It links the three photographs to a handwritten timeline.',
              'The last entry is circled twice and left unfinished.',
            ],
            highlight: true,
          },
          {
            heading: 'CLOSURE NOTICE',
            lines: [
              '"The Lost Memory Club is closed until further notice. Please return all borrowed tapes."',
              'There is no signature.',
            ],
          },
        ],
      },
      {
        label: PAGE_LABELS[1],
        blocks: [
          {
            heading: 'INVESTIGATOR NOTES',
            lines: ['The empty chair is the only object that appears in every photograph.'],
          },
          {
            heading: 'UNFINISHED ENTRY',
            lines: ['Whoever circled the last timeline entry did not finish writing it.'],
            highlight: true,
          },
        ],
      },
    ],
  },
  // placeholder lore for review by the story owner (Developer 3)
  'poster-shift': {
    id: 'poster-shift',
    tag: 'ARCHIVE NOTICE // SIGNAL',
    title: 'The Signal Remembers',
    theme: 'shift',
    accent: '#22d3ee',
    status: 'NOTICE // REWIND ANOMALY',
    specs: [
      { label: 'MEDIUM', value: 'TORN FLYER' },
      { label: 'SIGNAL', value: 'TAPE' },
      { label: 'ROOM', value: 'CHANGED' },
    ],
    pages: [
      {
        label: PAGE_LABELS[0],
        blocks: [
          {
            heading: 'NOTICE',
            lines: [
              'A torn notice pasted over an older flyer.',
              'It was not here before the room changed.',
            ],
          },
          {
            heading: 'PRINTED TEXT',
            lines: ['PLEASE REWIND. THE TAPE REMEMBERS YOU.'],
            highlight: true,
          },
        ],
      },
      {
        label: PAGE_LABELS[1],
        blocks: [
          {
            heading: 'MARGIN NOTE',
            lines: ['When the room shifts, the walls forget where they stood and the tape remembers for them.'],
            highlight: true,
          },
          {
            heading: 'WHAT TO LOOK FOR',
            lines: [
              'Look for what was added, what moved and what is missing.',
              'The signal keeps whatever you leave behind.',
            ],
          },
        ],
      },
    ],
  },
  // placeholder lore for review by the story owner (Developer 3)
  'poster-archive': {
    id: 'poster-archive',
    tag: 'CLUB NOTICE // MEMBERS ARCHIVE',
    title: 'Club Archive Notice',
    theme: 'notice',
    accent: '#7c2d12',
    status: 'LEDGER // ARCHIVE 09',
    specs: [
      { label: 'YEAR', value: '1996' },
      { label: 'TEAMS', value: '3' },
      { label: 'CLOSING', value: 'MIDNIGHT' },
    ],
    pages: [
      {
        label: PAGE_LABELS[0],
        blocks: [
          {
            heading: 'ARCHIVE 09 TOURNAMENT RESULTS, 1996',
            lines: [
              'First place: the Night Shift team.',
              'Second place: the Rewind Crew.',
              'Third place: a lone player known only as TAPE 001.',
            ],
            highlight: true,
          },
          {
            heading: 'CLOSING HOURS',
            lines: [
              'The club closes at midnight.',
              'Rewind every tape, switch off every cabinet and leave the lights on for whoever comes back.',
            ],
          },
        ],
      },
      {
        label: PAGE_LABELS[1],
        blocks: [
          {
            heading: 'MEMBERS IN GOOD STANDING',
            lines: [
              'The Night Shift, the Rewind Crew, the Tape Librarians.',
              'One empty line where a name was crossed out in pencil.',
            ],
            highlight: true,
          },
        ],
      },
    ],
  },
});
