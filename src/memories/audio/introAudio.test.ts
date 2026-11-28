import { describe, expect, it, vi } from 'vitest';
import { createIntroAudio, cueSeconds, planIntroCue } from './introAudio';

function fakeContext() {
  const calls = { oscillators: 0, sources: 0, resumed: 0 };
  const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 });
  const node = () => ({ connect: vi.fn() });
  const context = {
    state: 'suspended' as string,
    currentTime: 5,
    sampleRate: 1000,
    destination: {},
    createGain: () => ({ ...node(), gain: param() }),
    createOscillator: () => {
      calls.oscillators += 1;
      return { ...node(), type: 'sine', frequency: param(), start: vi.fn(), stop: vi.fn() };
    },
    createBiquadFilter: () => ({ ...node(), type: 'lowpass', frequency: { value: 0 } }),
    createBuffer: (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
    createBufferSource: () => {
      calls.sources += 1;
      return { ...node(), buffer: null, start: vi.fn(), stop: vi.fn() };
    },
    resume: () => {
      calls.resumed += 1;
      return Promise.resolve();
    },
    close: () => Promise.resolve(),
  };
  return { context: context as unknown as AudioContext, calls };
}

describe('intro cue plans', () => {
  it('builds every cue from positive durations and gains inside the valid range', () => {
    for (const cue of ['cassette-click', 'static-burst', 'soft-thunder'] as const) {
      for (const reduced of [false, true]) {
        for (const step of planIntroCue(cue, reduced)) {
          expect(step.duration).toBeGreaterThan(0);
          expect(step.gain).toBeGreaterThan(0);
          expect(step.gain).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('keeps the cassette click short and the thunder soft and long', () => {
    expect(cueSeconds(planIntroCue('cassette-click', false))).toBeLessThan(0.2);
    expect(cueSeconds(planIntroCue('soft-thunder', false))).toBeGreaterThan(2);
    expect(planIntroCue('soft-thunder', false)[0]).toMatchObject({ filter: 'lowpass' });
  });

  it('lowers the static hiss under reduced distortion without silencing it', () => {
    const normal = planIntroCue('static-burst', false)[0]!.gain;
    const reduced = planIntroCue('static-burst', true)[0]!.gain;
    expect(reduced).toBeLessThan(normal);
    expect(reduced).toBeGreaterThan(0);
  });
});

describe('createIntroAudio', () => {
  it('is a silent no-op when the browser has no audio context', () => {
    const audio = createIntroAudio(() => null);
    expect(() => {
      audio.unlock();
      audio.play('cassette-click', false);
      audio.close();
    }).not.toThrow();
  });

  it('schedules oscillators and noise through the context and resumes it', () => {
    const { context, calls } = fakeContext();
    const audio = createIntroAudio(() => context);
    audio.unlock();
    audio.play('cassette-click', false);
    expect(calls.resumed).toBeGreaterThan(0);
    expect(calls.oscillators).toBe(2);
    expect(calls.sources).toBe(1);
    audio.play('static-burst', true);
    expect(calls.sources).toBe(2);
  });

  it('creates the context once, even across several cues', () => {
    const factory = vi.fn(() => fakeContext().context);
    const audio = createIntroAudio(factory);
    audio.play('cassette-click', false);
    audio.play('soft-thunder', false);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
