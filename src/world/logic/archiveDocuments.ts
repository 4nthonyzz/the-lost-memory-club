// Pure data module: the Archive Document Card contents of the readable world props.
// All text is original and in English. No real brands, people or third-party material.
// Every entry below is placeholder lore for review by the story owner (Developer 3).
import type { ReadableId } from '../worldTypes';

export interface ArchiveDocument {
  id: ReadableId;
  /** Category tag line, shown above the title. */
  tag: string;
  title: string;
  /** Two to four short paragraphs. */
  paragraphs: readonly string[];
  /** Optional small diegetic line, used by cabinets whose game is not in service. */
  statusLine?: string;
}

/** Footer hint shown at the bottom of every card. */
export const ARCHIVE_FOOTER_HINT = 'Press E or move away to close';

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

export function isReadableId(id: string): id is ReadableId {
  return (READABLE_IDS as readonly string[]).includes(id);
}

export const ARCHIVE_DOCUMENTS: Readonly<Record<ReadableId, ArchiveDocument>> = Object.freeze({
  // placeholder lore for review by the story owner (Developer 3)
  'manual-snake': {
    id: 'manual-snake',
    tag: 'ARCADE MANUAL // CABINET 01',
    title: 'SNAKE.EXE Manual',
    paragraphs: [
      'Guide the serpent of magnetic VHS tape around the screen. Collect every tape fragment to lengthen the ribbon, and never cross your own tail.',
      'WARNING: a shadow serpent, spun from unwound tape, crawls the same board. If it reaches your head the session ends.',
      'Technician note: the score screen sometimes flickers a short code before it fades. Write it down. It may open something in the archive.',
    ],
  },
  // placeholder lore for review by the story owner (Developer 3)
  'manual-maze': {
    id: 'manual-maze',
    tag: 'ARCADE MANUAL // CABINET 02',
    title: 'LAST EXIT Manual',
    paragraphs: [
      'LAST EXIT drops the player into a dark labyrinth whose walls shift while nobody is watching. Do not trust a corridor you have already walked.',
      'Three photograph fragments were lost inside. Recover all three before you look for the exit.',
      'Something walks the corridors. It never runs and it never stops. If you hear it behind you, turn the nearest corner.',
    ],
    statusLine: CABINET_AWAITING_SERVICE,
  },
  // placeholder lore for review by the story owner (Developer 3)
  'manual-frequency': {
    id: 'manual-frequency',
    tag: 'ARCADE MANUAL // CABINET 03',
    title: 'DEAD FREQUENCY Manual',
    paragraphs: [
      'DEAD FREQUENCY plays a sequence of radio tones. Repeat each sequence exactly to decode the transmission that follows.',
      'Memory sequences grow longer every round. Listen for the gaps between the tones, because the gaps matter.',
      'Engineering anomaly: a carrier appears near 89.4 MHz where no station should be. We could not trace the source.',
    ],
    statusLine: CABINET_AWAITING_SERVICE,
  },
  // placeholder lore for review by the story owner (Developer 3)
  'desk-notebook': {
    id: 'desk-notebook',
    tag: 'TECHNICIAN LOG // NOV 1996',
    title: 'Shift Log Notebook',
    paragraphs: [
      'Nov 12, 11:40 pm. Another power surge during the late shift. Every cabinet flickered and the lights sagged for a slow count of three.',
      'Nov 13. Found unlabeled tapes on the console this morning. Nobody signed them out. I locked the cabinet and left a note for the owner.',
      'Nov 14. The tapes were back on the console. - Club attendant, night shift',
    ],
  },
  // placeholder lore for review by the story owner (Developer 3)
  'cork-board': {
    id: 'cork-board',
    tag: 'EVIDENCE BOARD // INCIDENT REPORT',
    title: 'Investigation Pinboard',
    paragraphs: [
      'Pinned Polaroids: the front desk after closing, a blurred hallway, and an empty chair facing the television. Each is dated one night apart.',
      'Red string: it links the three photographs to a handwritten timeline. The last entry is circled twice and left unfinished.',
      'Closure notice: "The Lost Memory Club is closed until further notice. Please return all borrowed tapes." There is no signature.',
    ],
  },
  // placeholder lore for review by the story owner (Developer 3)
  'poster-shift': {
    id: 'poster-shift',
    tag: 'ARCHIVE NOTICE // SIGNAL',
    title: 'The Signal Remembers',
    paragraphs: [
      'A torn notice pasted over an older flyer. It was not here before the room changed. Printed on it: PLEASE REWIND. THE TAPE REMEMBERS YOU.',
      'A note in the margin reads: when the room shifts, the walls forget where they stood and the tape remembers for them.',
      'Look for what was added, what moved and what is missing. The signal keeps whatever you leave behind.',
    ],
  },
  // placeholder lore for review by the story owner (Developer 3)
  'poster-archive': {
    id: 'poster-archive',
    tag: 'CLUB NOTICE // MEMBERS ARCHIVE',
    title: 'Club Archive Notice',
    paragraphs: [
      'ARCHIVE 09 TOURNAMENT RESULTS, 1996. First place: the Night Shift team. Second place: the Rewind Crew. Third place: a lone player known only as TAPE 001.',
      'Members in good standing: the Night Shift, the Rewind Crew, the Tape Librarians and one empty line where a name was crossed out in pencil.',
      'CLOSING HOURS: the club closes at midnight. Rewind every tape, switch off every cabinet and leave the lights on for whoever comes back.',
    ],
  },
});
