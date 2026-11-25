import { describe, expect, it } from 'vitest';
import {
  CHORD_THRESHOLD,
  chordGain,
  createVhsAudio,
  engineGain,
  heartbeatGain,
  heartbeatInterval,
  staticCutoff,
  staticGain,
  tensionLevel,
} from './vhsAudio';

describe('static noise', () => {
  it('gets quieter and darker as the signal improves', () => {
    let previousGain = Number.POSITIVE_INFINITY;
    let previousCutoff = Number.POSITIVE_INFINITY;
    for (let quality = 0; quality <= 1; quality += 0.1) {
      const gain = staticGain(quality, false, false);
      const cutoff = staticCutoff(quality);
      expect(gain).toBeLessThanOrEqual(previousGain);
      expect(cutoff).toBeLessThanOrEqual(previousCutoff);
      previousGain = gain;
      previousCutoff = cutoff;
    }
    expect(staticGain(1, false, false)).toBe(0);
  });

  it('respects mute and reduced distortion', () => {
    expect(staticGain(0, false, true)).toBe(0);
    expect(staticGain(0, true, false)).toBe(staticGain(0, false, false) / 2);
  });

  it('clamps invalid signal values', () => {
    expect(staticGain(Number.NaN, false, false)).toBe(staticGain(0, false, false));
    expect(staticGain(5, false, false)).toBe(0);
  });
});

describe('motor, chord and heartbeat', () => {
  it('runs the motor only while rewinding or fast-forwarding', () => {
    expect(engineGain('rewind', false)).toBeGreaterThan(0);
    expect(engineGain('ffwd', false)).toBeGreaterThan(0);
    expect(engineGain('playing', false)).toBe(0);
    expect(engineGain('paused', false)).toBe(0);
    expect(engineGain('rewind', true)).toBe(0);
  });

  it('plays the warm chord from a signal quality of 0.85', () => {
    expect(CHORD_THRESHOLD).toBe(0.85);
    expect(chordGain(0.84, false)).toBe(0);
    expect(chordGain(0.85, false)).toBeGreaterThan(0);
    expect(chordGain(1, true)).toBe(0);
  });

  it('starts the heartbeat under tension and speeds it up', () => {
    expect(heartbeatGain(0.1, false, false)).toBe(0);
    expect(heartbeatGain(0.5, false, false)).toBeGreaterThan(0);
    expect(heartbeatGain(1, false, true)).toBe(0);
    expect(heartbeatGain(1, true, false)).toBe(heartbeatGain(1, false, false) / 2);
    expect(heartbeatInterval(1)).toBeLessThan(heartbeatInterval(0.3));
  });

  it('derives tension from the clue reveal and the transport mode', () => {
    expect(tensionLevel(1, 'stopped')).toBe(0);
    expect(tensionLevel(1, 'paused')).toBe(1);
    expect(tensionLevel(1, 'rewind')).toBe(0.5);
    expect(tensionLevel(2, 'playing')).toBe(1);
  });
});

describe('createVhsAudio without Web Audio', () => {
  it('is a safe no-op', async () => {
    const audio = createVhsAudio();
    audio.update({ mode: 'playing', signalQuality: 0.5, tension: 0.5, muted: false, reducedDistortion: false });
    audio.click();
    await expect(audio.resume()).resolves.toBeUndefined();
    expect(() => audio.dispose()).not.toThrow();
  });
});
