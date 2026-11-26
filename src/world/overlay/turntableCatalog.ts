// Texts of the turntable catalog card (task 33.3). The track titles and BPM values come from MUSIC_CATALOG, the single source.
import { MUSIC_CATALOG, SILENT_TRACK, type MusicCatalogEntry } from '../audio/worldAudio';

export const TURNTABLE_CARD_TAG = 'HI-FI // 1990s TURNTABLE';
export const TURNTABLE_CARD_TITLE = '1990s Turntable';
export const TURNTABLE_FOOTER_HINT = 'Press 1-5 to select · E or move away to close';
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
