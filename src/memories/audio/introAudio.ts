/**
 * Procedural sound for the opening sequence. Nothing is loaded from disk: each cue is built from
 * oscillators and generated noise. The plan for each cue is pure data, so it can be tested without audio.
 */

export type IntroCue = 'cassette-click' | 'static-burst' | 'soft-thunder';

export interface ToneStep {
  readonly kind: 'tone';
  readonly start: number;
  readonly duration: number;
  readonly frequency: number;
  readonly gain: number;
}

export interface NoiseStep {
  readonly kind: 'noise';
  readonly start: number;
  readonly duration: number;
  readonly gain: number;
  readonly filter: BiquadFilterType;
  readonly frequency: number;
}

export type CueStep = ToneStep | NoiseStep;

/** Describes what each cue sounds like. Reduced distortion lowers the static hiss, never removes the cue. */
export function planIntroCue(cue: IntroCue, reducedDistortion: boolean): readonly CueStep[] {
  switch (cue) {
    case 'cassette-click':
      return [
        { kind: 'noise', start: 0, duration: 0.02, gain: 0.35, filter: 'highpass', frequency: 2500 },
        { kind: 'tone', start: 0, duration: 0.012, frequency: 1800, gain: 0.2 },
        { kind: 'tone', start: 0.11, duration: 0.01, frequency: 1200, gain: 0.15 },
      ];
    case 'static-burst':
      return [{ kind: 'noise', start: 0, duration: 0.7, gain: reducedDistortion ? 0.04 : 0.12, filter: 'bandpass', frequency: 2400 }];
    case 'soft-thunder':
      return [{ kind: 'noise', start: 0.2, duration: 2.2, gain: 0.18, filter: 'lowpass', frequency: 160 }];
  }
}

/** Length of a cue in seconds, from the first sound to the last one. */
export function cueSeconds(steps: readonly CueStep[]): number {
  return steps.reduce((longest, step) => Math.max(longest, step.start + step.duration), 0);
}

export interface IntroAudio {
  /** Creates and resumes the audio context. Call it from the PLAY click, which is a user gesture. */
  unlock(): void;
  play(cue: IntroCue, reducedDistortion: boolean): void;
  close(): void;
}

type ContextFactory = () => AudioContext | null;

function defaultContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Constructor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Constructor) return null;
  try {
    return new Constructor();
  } catch {
    return null;
  }
}

function scheduleStep(context: AudioContext, step: CueStep, origin: number): void {
  const start = origin + step.start;
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, step.gain), start + 0.005);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + step.duration);
  envelope.connect(context.destination);

  if (step.kind === 'tone') {
    const oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(step.frequency, start);
    oscillator.connect(envelope);
    oscillator.start(start);
    oscillator.stop(start + step.duration);
    return;
  }

  const frames = Math.max(1, Math.ceil(context.sampleRate * step.duration));
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < frames; index += 1) samples[index] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = step.filter;
  filter.frequency.value = step.frequency;
  source.connect(filter);
  filter.connect(envelope);
  source.start(start);
  source.stop(start + step.duration);
}

/** Creates the intro sound player. If audio is unsupported, every call is a silent no-op. */
export function createIntroAudio(createContext: ContextFactory = defaultContext): IntroAudio {
  let context: AudioContext | null = null;
  let unsupported = false;

  function ensureContext(): AudioContext | null {
    if (context) return context;
    if (unsupported) return null;
    context = createContext();
    if (!context) unsupported = true;
    return context;
  }

  return {
    unlock() {
      const current = ensureContext();
      if (current && current.state === 'suspended') void current.resume();
    },
    play(cue, reducedDistortion) {
      const current = ensureContext();
      if (!current) return;
      if (current.state === 'suspended') void current.resume();
      const origin = current.currentTime;
      for (const step of planIntroCue(cue, reducedDistortion)) scheduleStep(current, step, origin);
    },
    close() {
      if (context) void context.close();
      context = null;
    },
  };
}
