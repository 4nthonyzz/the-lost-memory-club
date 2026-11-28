export type ActionCue = 'clunk' | 'polaroid' | 'coin';

export interface ActionTone {
  readonly type: 'tone' | 'noise';
  readonly start: number;
  readonly duration: number;
  readonly frequency: number;
  readonly gain: number;
}

/** Pure cue plans keep the small action sounds deterministic and easy to test. */
export function actionCuePlan(cue: ActionCue): readonly ActionTone[] {
  switch (cue) {
    case 'clunk':
      return [
        { type: 'noise', start: 0, duration: 0.06, frequency: 220, gain: 0.25 },
        { type: 'tone', start: 0.02, duration: 0.08, frequency: 95, gain: 0.2 },
      ];
    case 'polaroid':
      return [
        { type: 'noise', start: 0, duration: 0.12, frequency: 1800, gain: 0.08 },
        { type: 'tone', start: 0.16, duration: 0.26, frequency: 640, gain: 0.12 },
      ];
    case 'coin':
      return [
        { type: 'tone', start: 0, duration: 0.12, frequency: 880, gain: 0.18 },
        { type: 'tone', start: 0.11, duration: 0.18, frequency: 1320, gain: 0.14 },
      ];
  }
}

interface ActionAudio {
  play(cue: ActionCue): void;
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

function schedule(context: AudioContext, step: ActionTone, origin: number): void {
  const start = origin + step.start;
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, step.gain), start + 0.005);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + step.duration);
  envelope.connect(context.destination);
  if (step.type === 'tone') {
    const oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(step.frequency, start);
    oscillator.connect(envelope);
    oscillator.start(start);
    oscillator.stop(start + step.duration);
    return;
  }
  const length = Math.max(1, Math.ceil(context.sampleRate * step.duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = step.frequency;
  source.connect(filter);
  filter.connect(envelope);
  source.start(start);
  source.stop(start + step.duration);
}

export function createActionAudio(createContext: ContextFactory = defaultContext): ActionAudio {
  let context: AudioContext | null = null;
  return {
    play(cue) {
      context ??= createContext();
      if (!context) return;
      if (context.state === 'suspended') void context.resume();
      const origin = context.currentTime;
      for (const step of actionCuePlan(cue)) schedule(context, step, origin);
    },
    close() {
      if (context) void context.close();
      context = null;
    },
  };
}
