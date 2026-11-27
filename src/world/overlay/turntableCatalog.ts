// Texts of the turntable catalog card (task 33.3). The track titles and BPM values come from MUSIC_CATALOG, the single source.
import { MUSIC_CATALOG, SILENT_TRACK, type MusicCatalogEntry } from '../audio/worldAudio';

export const TURNTABLE_CARD_TAG = 'HI-FI // 1990s TURNTABLE';
export const TURNTABLE_CARD_TITLE = '1990s Turntable';
/** Key legend (replaces the earlier "Press 1-5 ..." footer). \u2013 is an en dash, \u00b7 a middle dot. */
export const TURNTABLE_FOOTER_HINT = '[1\u20134] Spin \u00b7 [5] Stop \u00b7 [E / Esc] Close \u00b7 [M] Mute';
/** Archive liner note under the status pill. Original wording. */
export const TURNTABLE_LINER_NOTE =
  'Archive liner note: the club closed at midnight, but this record kept turning. Sleeve 5 is blank, and nobody remembers who lifts the needle.';
export const TURNTABLE_STOPPED_LABEL = 'STOPPED';

/** BPM text of a catalog row: "78 BPM", or "SILENT" for the stop entry. */
export function trackBpmLabel(entry: MusicCatalogEntry): string {
  return entry.bpm > 0 ? `${entry.bpm} BPM` : 'SILENT';
}

/** The status pill text: the title of the playing track, or STOPPED. */
export function turntableStatusText(playingTrack: number | null): string {
  if (playingTrack === null || playingTrack === SILENT_TRACK) return TURNTABLE_STOPPED_LABEL;
  return `NOW PLAYING: ${MUSIC_CATALOG[playingTrack]?.title ?? TURNTABLE_STOPPED_LABEL}`;
}
