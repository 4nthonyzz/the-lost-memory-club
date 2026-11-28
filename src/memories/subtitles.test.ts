import { describe, expect, it } from 'vitest';
import { ACTS, ARCHIVE_TAPE, TAPES } from './fragments/memoryCatalog';
import { TRANSPORT_FPS } from './restoration/types';
import { subtitleAt, SUBTITLES } from './subtitles';

describe('subtitles', () => {
  it('has cues for every tape in both languages', () => {
    for (const tape of TAPES) {
      const cues = SUBTITLES[tape.id];
      expect(cues?.length).toBeGreaterThan(0);
      for (const cue of cues ?? []) {
        expect(cue.en.length).toBeGreaterThan(0);
        expect(cue.es.length).toBeGreaterThan(0);
        expect(cue.es).not.toBe(cue.en);
      }
    }
  });

  it('keeps cues ordered, non-overlapping and inside the tape', () => {
    for (const tape of TAPES) {
      let previousEnd = 0;
      for (const cue of SUBTITLES[tape.id] ?? []) {
        expect(cue.start).toBeLessThan(cue.end);
        expect(cue.start).toBeGreaterThanOrEqual(previousEnd);
        expect(cue.end).toBeLessThanOrEqual(tape.duration);
        previousEnd = cue.end;
      }
    }
  });

  it('shows a cue over every clue window', () => {
    for (const tape of [...ACTS.map((act) => act.tape), ARCHIVE_TAPE]) {
      for (const window of tape.clueWindows) {
        const start = window.startFrame / TRANSPORT_FPS;
        const end = window.endFrame / TRANSPORT_FPS;
        expect(subtitleAt(tape.id, start, 'en')).not.toBeNull();
        expect(subtitleAt(tape.id, end, 'en')).not.toBeNull();
      }
    }
  });

  it('switches language instantly and returns null between cues', () => {
    const first = ACTS[0]!.tape.id;
    expect(subtitleAt(first, 3, 'en')).toContain('Rolling!');
    expect(subtitleAt(first, 3, 'es')).toContain('Grabando');
    expect(subtitleAt(first, 0, 'en')).toBeNull();
    expect(subtitleAt('unknown-tape', 3, 'en')).toBeNull();
  });
});
