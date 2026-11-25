import { describe, expect, it } from 'vitest';
import { ACTS, ARCHIVE_TAPE, TAPES } from './fragments/memoryCatalog';
import { createTransportState, transportReducer } from './restoration/transportReducer';
import { TRANSPORT_FPS, type TransportState } from './restoration/types';
import { formatClock, isInAnomalyWindow, SIGNAL_THRESHOLD } from './vhsVisuals';

const tape = ACTS[0]!.tape;
const clue = tape.clueWindows[0]!;
const windowMid = (clue.startFrame + clue.endFrame) / 2 / TRANSPORT_FPS;

function loaded(): TransportState {
  return transportReducer(createTransportState(), { type: 'LOAD_TAPE', tape });
}

describe('SEEK', () => {
  it('moves the position while stopped or playing without changing the mode', () => {
    const stopped = transportReducer(loaded(), { type: 'SEEK', position: 20 });
    expect(stopped).toMatchObject({ position: 20, mode: 'stopped' });
    const playing = transportReducer(transportReducer(loaded(), { type: 'PLAY' }), { type: 'SEEK', position: 10 });
    expect(playing).toMatchObject({ position: 10, mode: 'playing' });
  });

  it('clamps to the tape bounds and ignores non-finite values', () => {
    expect(transportReducer(loaded(), { type: 'SEEK', position: -5 }).position).toBe(0);
    expect(transportReducer(loaded(), { type: 'SEEK', position: 9999 }).position).toBe(tape.duration);
    const seeked = transportReducer(loaded(), { type: 'SEEK', position: 20 });
    expect(transportReducer(seeked, { type: 'SEEK', position: Number.NaN })).toBe(seeked);
  });

  it('detects the clue when seeking into the window while paused with tracking in range', () => {
    const playing = transportReducer(loaded(), { type: 'SET_TRACKING', value: tape.idealTracking });
    const paused = transportReducer(transportReducer(playing, { type: 'PLAY' }), { type: 'PAUSE' });
    const seeked = transportReducer(paused, { type: 'SEEK', position: windowMid });
    expect(seeked.detections).toHaveLength(1);
  });

  it('does nothing without a tape', () => {
    const empty = createTransportState();
    expect(transportReducer(empty, { type: 'SEEK', position: 10 })).toEqual(empty);
  });
});

describe('isInAnomalyWindow', () => {
  it('is true only inside a clue window', () => {
    expect(isInAnomalyWindow(tape, windowMid)).toBe(true);
    expect(isInAnomalyWindow(tape, 1)).toBe(false);
    expect(isInAnomalyWindow(null, windowMid)).toBe(false);
  });

  it('holds for every tape at its own window', () => {
    for (const source of [...ACTS.map((act) => act.tape), ARCHIVE_TAPE]) {
      const window = source.clueWindows[0]!;
      expect(isInAnomalyWindow(source, window.startFrame / TRANSPORT_FPS)).toBe(true);
    }
    expect(TAPES.length).toBeGreaterThan(0);
  });
});

describe('formatClock and the signal threshold', () => {
  it('formats whole minutes and seconds', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(75.9)).toBe('01:15');
    expect(formatClock(-3)).toBe('00:00');
    expect(formatClock(Number.NaN)).toBe('00:00');
  });

  it('uses the same 0.8 threshold as the amber atmosphere', () => {
    expect(SIGNAL_THRESHOLD).toBe(0.8);
  });
});
