import { describe, expect, it } from 'vitest';
import { MEMORY_ID } from '../../core/contracts';
import { ACTS, ARCHIVE_TAPE, PERFECT_TRACKING_CLUE_ID, TAPES } from '../fragments/memoryCatalog';
import {
  computeSignalQuality,
  createTransportState,
  frameAt,
  hasDetection,
  newDetections,
  transportReducer,
} from './transportReducer';
import { TRANSPORT_FPS, type TapeDefinition, type TransportAction, type TransportState } from './types';

const firstAct = ACTS[0]!;
const tape = firstAct.tape;
const window = tape.clueWindows[0]!;

function run(actions: TransportAction[], initial: TransportState = createTransportState()): TransportState {
  return actions.reduce(transportReducer, initial);
}

function pausedAt(seconds: number, tracking: number, source: TapeDefinition = tape): TransportState {
  return run([
    { type: 'LOAD_TAPE', tape: source },
    { type: 'SET_TRACKING', value: tracking },
    { type: 'PLAY' },
    { type: 'TICK', seconds },
    { type: 'PAUSE' },
  ]);
}

describe('transport basics', () => {
  it('ignores transport actions until a tape is loaded', () => {
    const empty = createTransportState();
    expect(run([{ type: 'PLAY' }, { type: 'TICK', seconds: 5 }, { type: 'SET_TRACKING', value: 80 }])).toEqual(empty);
  });

  it('rejects tapes with an invalid duration', () => {
    expect(run([{ type: 'LOAD_TAPE', tape: { ...tape, duration: 0 } }])).toEqual(createTransportState());
    expect(run([{ type: 'LOAD_TAPE', tape: { ...tape, duration: Number.NaN } }])).toEqual(createTransportState());
  });

  it('loads a tape in the stopped mode with a computed signal quality', () => {
    const state = run([{ type: 'LOAD_TAPE', tape }]);
    expect(state).toMatchObject({ mode: 'stopped', position: 0, duration: tape.duration, tracking: tape.initialTracking });
    expect(state.signalQuality).toBe(computeSignalQuality(tape, tape.initialTracking));
  });

  it('advances while playing and stops at the end of the tape', () => {
    const playing = run([{ type: 'LOAD_TAPE', tape }, { type: 'PLAY' }, { type: 'TICK', seconds: 10 }]);
    expect(playing).toMatchObject({ mode: 'playing', position: 10 });
    const finished = transportReducer(playing, { type: 'TICK', seconds: 1000 });
    expect(finished).toMatchObject({ mode: 'stopped', position: tape.duration });
  });

  it('rewinds faster than playback and stops at zero', () => {
    const rewinding = run([{ type: 'LOAD_TAPE', tape }, { type: 'PLAY' }, { type: 'TICK', seconds: 40 }, { type: 'REWIND' }, { type: 'TICK', seconds: 5 }]);
    expect(rewinding).toMatchObject({ mode: 'rewind', position: 20 });
    expect(transportReducer(rewinding, { type: 'TICK', seconds: 100 })).toMatchObject({ mode: 'stopped', position: 0 });
  });

  it('fast-forwards and stops at the end', () => {
    const forwarding = run([{ type: 'LOAD_TAPE', tape }, { type: 'FAST_FORWARD' }, { type: 'TICK', seconds: 10 }]);
    expect(forwarding).toMatchObject({ mode: 'ffwd', position: 30 });
    expect(transportReducer(forwarding, { type: 'TICK', seconds: 1000 })).toMatchObject({ mode: 'stopped', position: tape.duration });
  });

  it('does not rewind from the start or fast-forward from the end', () => {
    expect(run([{ type: 'LOAD_TAPE', tape }, { type: 'REWIND' }]).mode).toBe('stopped');
    const atEnd = run([{ type: 'LOAD_TAPE', tape }, { type: 'PLAY' }, { type: 'TICK', seconds: 1000 }]);
    expect(transportReducer(atEnd, { type: 'FAST_FORWARD' }).mode).toBe('stopped');
  });

  it('restarts from the beginning when playing a finished tape', () => {
    const atEnd = run([{ type: 'LOAD_TAPE', tape }, { type: 'PLAY' }, { type: 'TICK', seconds: 1000 }]);
    expect(transportReducer(atEnd, { type: 'PLAY' })).toMatchObject({ mode: 'playing', position: 0 });
  });

  it('ignores invalid tick values and ticks while not moving', () => {
    const playing = run([{ type: 'LOAD_TAPE', tape }, { type: 'PLAY' }]);
    for (const seconds of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(transportReducer(playing, { type: 'TICK', seconds })).toBe(playing);
    }
    const paused = transportReducer(playing, { type: 'PAUSE' });
    expect(transportReducer(paused, { type: 'TICK', seconds: 5 })).toBe(paused);
  });

  it('only pauses while the tape is moving', () => {
    const stopped = run([{ type: 'LOAD_TAPE', tape }]);
    expect(transportReducer(stopped, { type: 'PAUSE' })).toBe(stopped);
  });

  it('keeps the position when stopped and keeps detections when ejected', () => {
    const found = pausedAt(42, 62);
    const ejected = transportReducer(found, { type: 'EJECT' });
    expect(ejected.tape).toBeNull();
    expect(ejected.detections).toEqual(found.detections);
    expect(transportReducer(found, { type: 'STOP' }).position).toBe(found.position);
  });

  it('does not mutate the previous state', () => {
    const before = pausedAt(10, 62);
    const snapshot = structuredClone(before);
    transportReducer(before, { type: 'SET_TRACKING', value: 10 });
    transportReducer(before, { type: 'STEP_FRAME', direction: 1 });
    expect(before).toEqual(snapshot);
  });
});

describe('tracking and signal quality', () => {
  it('clamps tracking between 0 and 100', () => {
    const loaded = run([{ type: 'LOAD_TAPE', tape }]);
    expect(transportReducer(loaded, { type: 'SET_TRACKING', value: 500 }).tracking).toBe(100);
    expect(transportReducer(loaded, { type: 'SET_TRACKING', value: -20 }).tracking).toBe(0);
    expect(transportReducer(loaded, { type: 'SET_TRACKING', value: Number.NaN }).tracking).toBe(50);
    expect(transportReducer(loaded, { type: 'ADJUST_TRACKING', delta: 1000 }).tracking).toBe(100);
  });

  it('keeps signal quality inside 0..1 and peaks at the ideal tracking for every tape', () => {
    for (const source of TAPES) {
      let best = -1;
      let bestTracking = -1;
      for (let value = 0; value <= 100; value += 1) {
        const quality = computeSignalQuality(source, value);
        expect(quality).toBeGreaterThanOrEqual(0);
        expect(quality).toBeLessThanOrEqual(1);
        if (quality > best) {
          best = quality;
          bestTracking = value;
        }
      }
      expect(best).toBe(1);
      expect(bestTracking).toBe(Math.round(source.idealTracking));
    }
  });

  it('updates signal quality when tracking changes', () => {
    const loaded = run([{ type: 'LOAD_TAPE', tape }]);
    const tuned = transportReducer(loaded, { type: 'SET_TRACKING', value: tape.idealTracking });
    expect(tuned.signalQuality).toBe(1);
    expect(transportReducer(tuned, { type: 'ADJUST_TRACKING', delta: -30 }).signalQuality).toBeLessThan(1);
  });

  it('reports zero quality without a tape', () => {
    expect(computeSignalQuality(null, 50)).toBe(0);
  });
});

describe('clue detection', () => {
  it('detects the clue when paused inside the frame window with tracking in tolerance', () => {
    const state = pausedAt(42, 62);
    expect(state.detections).toEqual([{ tapeId: tape.id, clueId: firstAct.clueId }]);
  });

  it('detects the clue at both edges of the frame window', () => {
    expect(hasDetection(pausedAt(window.startFrame / TRANSPORT_FPS, 62), tape.id, firstAct.clueId)).toBe(true);
    expect(hasDetection(pausedAt(window.endFrame / TRANSPORT_FPS, 62), tape.id, firstAct.clueId)).toBe(true);
  });

  it('does not detect the clue just outside the frame window', () => {
    expect(pausedAt(window.startFrame / TRANSPORT_FPS - 0.1, 62).detections).toEqual([]);
    expect(pausedAt((window.endFrame + 1) / TRANSPORT_FPS, 62).detections).toEqual([]);
  });

  it('does not detect the clue when tracking is outside tolerance', () => {
    expect(pausedAt(42, window.trackingMin - 1).detections).toEqual([]);
    expect(pausedAt(42, window.trackingMax + 1).detections).toEqual([]);
    expect(hasDetection(pausedAt(42, window.trackingMin), tape.id, firstAct.clueId)).toBe(true);
    expect(hasDetection(pausedAt(42, window.trackingMax), tape.id, firstAct.clueId)).toBe(true);
  });

  it('does not detect clues while the tape is moving', () => {
    const playing = run([{ type: 'LOAD_TAPE', tape }, { type: 'SET_TRACKING', value: 62 }, { type: 'PLAY' }, { type: 'TICK', seconds: 42 }]);
    expect(playing.detections).toEqual([]);
    expect(transportReducer(playing, { type: 'SET_TRACKING', value: 63 }).detections).toEqual([]);
  });

  it('detects the clue by adjusting tracking while paused on the right frame', () => {
    const missed = pausedAt(42, 20);
    expect(missed.detections).toEqual([]);
    const tuned = transportReducer(missed, { type: 'SET_TRACKING', value: 60 });
    expect(hasDetection(tuned, tape.id, firstAct.clueId)).toBe(true);
  });

  it('detects the clue by stepping frame by frame into the window', () => {
    let state = pausedAt(window.startFrame / TRANSPORT_FPS - 2 / TRANSPORT_FPS, 62);
    expect(state.detections).toEqual([]);
    state = transportReducer(state, { type: 'STEP_FRAME', direction: 1 });
    expect(state.detections).toEqual([]);
    state = transportReducer(state, { type: 'STEP_FRAME', direction: 1 });
    expect(frameAt(state.position)).toBe(window.startFrame);
    expect(hasDetection(state, tape.id, firstAct.clueId)).toBe(true);
  });

  it('steps frames only while paused and clamps at the tape boundaries', () => {
    const playing = run([{ type: 'LOAD_TAPE', tape }, { type: 'PLAY' }]);
    expect(transportReducer(playing, { type: 'STEP_FRAME', direction: 1 })).toBe(playing);
    const atStart = run([{ type: 'LOAD_TAPE', tape }, { type: 'PLAY' }, { type: 'PAUSE' }, { type: 'STEP_FRAME', direction: -1 }]);
    expect(atStart.position).toBe(0);
    const atEnd = run([{ type: 'LOAD_TAPE', tape }, { type: 'PLAY' }, { type: 'TICK', seconds: tape.duration - 0.01 }, { type: 'PAUSE' }, { type: 'STEP_FRAME', direction: 1 }, { type: 'STEP_FRAME', direction: 1 }]);
    expect(atEnd.position).toBeLessThanOrEqual(tape.duration);
  });

  it('never records the same clue twice', () => {
    let state = pausedAt(42, 62);
    state = transportReducer(state, { type: 'STEP_FRAME', direction: 1 });
    state = transportReducer(state, { type: 'SET_TRACKING', value: 63 });
    expect(state.detections).toHaveLength(1);
  });

  it('reports only the detections added by a transition', () => {
    const before = pausedAt(42, 20);
    const after = transportReducer(before, { type: 'SET_TRACKING', value: 62 });
    expect(newDetections(before, after)).toEqual([{ tapeId: tape.id, clueId: firstAct.clueId }]);
    expect(newDetections(after, after)).toEqual([]);
  });

  it('detects every act clue on its own tape', () => {
    for (const act of ACTS) {
      const clueWindow = act.tape.clueWindows[0]!;
      const state = pausedAt(clueWindow.startFrame / TRANSPORT_FPS, act.tape.idealTracking, act.tape);
      expect(state.detections).toEqual([{ tapeId: act.tape.id, clueId: act.clueId }]);
    }
  });

  it('does not detect a clue from another tape', () => {
    const second = ACTS[1]!;
    const state = pausedAt(42, 62, second.tape);
    expect(state.detections).toEqual([]);
  });
});

describe('perfect tracking on archive-09', () => {
  const archiveWindow = ARCHIVE_TAPE.clueWindows[0]!;
  const seconds = archiveWindow.startFrame / TRANSPORT_FPS;

  it('is detected only at exactly 100% tracking', () => {
    expect(ARCHIVE_TAPE.id).toBe(MEMORY_ID);
    const perfect = pausedAt(seconds, 100, ARCHIVE_TAPE);
    expect(perfect.signalQuality).toBe(1);
    expect(hasDetection(perfect, MEMORY_ID, PERFECT_TRACKING_CLUE_ID)).toBe(true);
  });

  it('is not detected at 99.9% tracking', () => {
    const almost = pausedAt(seconds, 99.9, ARCHIVE_TAPE);
    expect(almost.signalQuality).toBeLessThan(1);
    expect(almost.detections).toEqual([]);
  });

  it('is not detected at perfect tracking outside the frame window', () => {
    expect(pausedAt(5, 100, ARCHIVE_TAPE).detections).toEqual([]);
  });

  it('is detected when tracking reaches 100% while paused on the frame', () => {
    const almost = pausedAt(seconds, 99, ARCHIVE_TAPE);
    const perfect = transportReducer(almost, { type: 'ADJUST_TRACKING', delta: 1 });
    expect(hasDetection(perfect, MEMORY_ID, PERFECT_TRACKING_CLUE_ID)).toBe(true);
  });
});

describe('catalog integrity', () => {
  it('keeps every clue window inside its tape and solvable at the ideal tracking', () => {
    for (const source of TAPES) {
      expect(source.initialTracking).toBeGreaterThanOrEqual(0);
      for (const clueWindow of source.clueWindows) {
        expect(clueWindow.startFrame).toBeLessThanOrEqual(clueWindow.endFrame);
        expect(clueWindow.endFrame).toBeLessThanOrEqual(frameAt(source.duration));
        expect(source.idealTracking).toBeGreaterThanOrEqual(clueWindow.trackingMin);
        expect(source.idealTracking).toBeLessThanOrEqual(clueWindow.trackingMax);
      }
    }
  });
});
