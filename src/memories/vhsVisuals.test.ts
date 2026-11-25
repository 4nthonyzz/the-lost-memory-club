import { describe, expect, it } from 'vitest';
import { ACTS } from './fragments/memoryCatalog';
import { createTransportState, transportReducer } from './restoration/transportReducer';
import { TRANSPORT_FPS, type TransportAction, type TransportState } from './restoration/types';
import { AMBER_THRESHOLD, atmosphereFor, clueReveal, computeVisualParams, formatTimecode } from './vhsVisuals';

const tape = ACTS[0]!.tape;
const window = tape.clueWindows[0]!;

function run(actions: TransportAction[]): TransportState {
  return actions.reduce(transportReducer, createTransportState());
}

describe('atmosphere', () => {
  it('switches from cold to amber at a signal quality of 0.8', () => {
    expect(AMBER_THRESHOLD).toBe(0.8);
    expect(atmosphereFor(0.79)).toBe('cold');
    expect(atmosphereFor(0.8)).toBe('amber');
    expect(atmosphereFor(1)).toBe('amber');
  });
});

describe('clueReveal', () => {
  it('is full inside the window with tracking in tolerance', () => {
    expect(clueReveal(tape, window.startFrame / TRANSPORT_FPS, tape.idealTracking)).toBe(1);
  });

  it('fades with distance from the window and from the right tracking', () => {
    const near = clueReveal(tape, window.startFrame / TRANSPORT_FPS - 1, tape.idealTracking);
    const far = clueReveal(tape, window.startFrame / TRANSPORT_FPS - 1.9, tape.idealTracking);
    expect(near).toBeGreaterThan(far);
    expect(clueReveal(tape, 5, tape.idealTracking)).toBe(0);
    expect(clueReveal(tape, window.startFrame / TRANSPORT_FPS, 0)).toBe(0);
  });

  it('is zero without a tape', () => {
    expect(clueReveal(null, 0, 50)).toBe(0);
  });
});

describe('computeVisualParams', () => {
  const loaded = run([{ type: 'LOAD_TAPE', tape }]);
  const playing = transportReducer(loaded, { type: 'PLAY' });
  const poor = transportReducer(playing, { type: 'SET_TRACKING', value: 0 });
  const tuned = transportReducer(playing, { type: 'SET_TRACKING', value: tape.idealTracking });

  it('adds noise, jitter and chromatic shift when the signal is poor', () => {
    const rough = computeVisualParams(poor, false);
    const clean = computeVisualParams(tuned, false);
    expect(rough.noise).toBeGreaterThan(clean.noise);
    expect(rough.jitter).toBeGreaterThan(0);
    expect(clean.jitter).toBe(0);
    expect(rough.chromatic).toBeGreaterThan(clean.chromatic);
    expect(clean.atmosphere).toBe('amber');
    expect(rough.atmosphere).toBe('cold');
  });

  it('removes shaking and flicker and limits aberration with reduced distortion', () => {
    const reduced = computeVisualParams(poor, true);
    const full = computeVisualParams(poor, false);
    expect(reduced.jitter).toBe(0);
    expect(reduced.flicker).toBe(0);
    expect(reduced.chromatic).toBeLessThanOrEqual(1);
    expect(reduced.noise).toBeLessThan(full.noise);
  });

  it('shifts bands only while rewinding or fast-forwarding', () => {
    const rewinding = run([{ type: 'LOAD_TAPE', tape }, { type: 'PLAY' }, { type: 'TICK', seconds: 20 }, { type: 'REWIND' }]);
    expect(computeVisualParams(rewinding, false).bandShift).toBeGreaterThan(computeVisualParams(rewinding, true).bandShift);
    expect(computeVisualParams(loaded, false).bandShift).toBe(0);
  });

  it('keeps every value in range across all tracking values', () => {
    for (let value = 0; value <= 100; value += 5) {
      const params = computeVisualParams(transportReducer(playing, { type: 'SET_TRACKING', value }), false);
      expect(params.noise).toBeGreaterThanOrEqual(0);
      expect(params.noise).toBeLessThanOrEqual(1);
      expect(params.reveal).toBeGreaterThanOrEqual(0);
      expect(params.reveal).toBeLessThanOrEqual(1);
      expect(params.chromatic).toBeLessThanOrEqual(6);
    }
  });
});

describe('formatTimecode', () => {
  it('formats minutes, seconds and frames', () => {
    expect(formatTimecode(0)).toBe('00:00:00');
    expect(formatTimecode(42.5)).toBe('00:42:12');
    expect(formatTimecode(61 + 1 / TRANSPORT_FPS)).toBe('01:01:01');
  });
});
