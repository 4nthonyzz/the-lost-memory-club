import type { TransportMode } from '../restoration/types';

export const CHORD_THRESHOLD = 0.85;
export const HEARTBEAT_THRESHOLD = 0.3;

const CHORD_FREQUENCIES = [110, 138.59, 164.81, 207.65] as const;

export interface AudioInput {
  mode: TransportMode;
  signalQuality: number;
  tension: number;
  muted: boolean;
  reducedDistortion: boolean;
}

export interface VhsAudio {
  resume(): Promise<void>;
  update(input: AudioInput): void;
  click(): void;
  dispose(): void;
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

export function staticGain(signalQuality: number, reducedDistortion: boolean, muted: boolean): number {
  if (muted) return 0;
  const gain = 0.12 * (1 - clamp01(signalQuality));
  return reducedDistortion ? gain * 0.5 : gain;
}

export function staticCutoff(signalQuality: number): number {
  return 600 + (1 - clamp01(signalQuality)) * 7400;
}

export function engineGain(mode: TransportMode, muted: boolean): number {
  return !muted && (mode === 'rewind' || mode === 'ffwd') ? 0.05 : 0;
}

export function engineFrequency(mode: TransportMode): number {
  return mode === 'ffwd' ? 110 : 82;
}

export function chordGain(signalQuality: number, muted: boolean): number {
  return !muted && signalQuality >= CHORD_THRESHOLD ? 0.035 : 0;
}

export function heartbeatGain(tension: number, reducedDistortion: boolean, muted: boolean): number {
  const level = clamp01(tension);
  if (muted || level < HEARTBEAT_THRESHOLD) return 0;
  const gain = 0.25 * level;
  return reducedDistortion ? gain * 0.5 : gain;
}

export function heartbeatInterval(tension: number): number {
  return Math.round(60000 / (50 + 70 * clamp01(tension)));
}

export function tensionLevel(reveal: number, mode: TransportMode): number {
  const level = clamp01(reveal);
  if (mode === 'stopped') return 0;
  return mode === 'rewind' || mode === 'ffwd' ? level * 0.5 : level;
}

interface AudioGraph {
  context: AudioContext;
  master: GainNode;
  noiseBuffer: AudioBuffer;
  staticFilter: BiquadFilterNode;
  staticNode: GainNode;
  engineOscillator: OscillatorNode;
  engineNode: GainNode;
  chordNode: GainNode;
}

function buildGraph(): AudioGraph | null {
  if (typeof AudioContext === 'undefined') return null;
  const context = new AudioContext();
  const master = context.createGain();
  master.connect(context.destination);

  const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const samples = noiseBuffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;

  const noise = context.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  const staticFilter = context.createBiquadFilter();
  staticFilter.type = 'lowpass';
  const staticNode = context.createGain();
  staticNode.gain.value = 0;
  noise.connect(staticFilter);
  staticFilter.connect(staticNode);
  staticNode.connect(master);
  noise.start();

  const engineOscillator = context.createOscillator();
  engineOscillator.type = 'sawtooth';
  engineOscillator.frequency.value = engineFrequency('rewind');
  const engineFilter = context.createBiquadFilter();
  engineFilter.type = 'lowpass';
  engineFilter.frequency.value = 260;
  const engineNode = context.createGain();
  engineNode.gain.value = 0;
  engineOscillator.connect(engineFilter);
  engineFilter.connect(engineNode);
  engineNode.connect(master);
  engineOscillator.start();

  const chordNode = context.createGain();
  chordNode.gain.value = 0;
  chordNode.connect(master);
  for (const frequency of CHORD_FREQUENCIES) {
    const voice = context.createOscillator();
    voice.type = 'triangle';
    voice.frequency.value = frequency;
    voice.connect(chordNode);
    voice.start();
  }

  return { context, master, noiseBuffer, staticFilter, staticNode, engineOscillator, engineNode, chordNode };
}

function playThump(graph: AudioGraph, peak: number, delay: number): void {
  const { context, master } = graph;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(72, start);
  oscillator.frequency.exponentialRampToValueAtTime(36, start + 0.2);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.linearRampToValueAtTime(peak, start + 0.02);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
  oscillator.connect(envelope);
  envelope.connect(master);
  oscillator.start(start);
  oscillator.stop(start + 0.3);
}

export function createVhsAudio(): VhsAudio {
  let graph: AudioGraph | null = null;
  let latest: AudioInput | null = null;
  let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;

  function stopHeartbeat(): void {
    if (heartbeatTimer !== null) clearTimeout(heartbeatTimer);
    heartbeatTimer = null;
  }

  function beat(): void {
    heartbeatTimer = null;
    if (!graph || !latest) return;
    const peak = heartbeatGain(latest.tension, latest.reducedDistortion, latest.muted);
    if (peak === 0) return;
    playThump(graph, peak, 0);
    playThump(graph, peak * 0.7, 0.18);
    heartbeatTimer = setTimeout(beat, heartbeatInterval(latest.tension));
  }

  function apply(input: AudioInput): void {
    if (!graph) return;
    const now = graph.context.currentTime;
    graph.master.gain.setTargetAtTime(input.muted ? 0 : 1, now, 0.05);
    graph.staticFilter.frequency.setTargetAtTime(staticCutoff(input.signalQuality), now, 0.1);
    graph.staticNode.gain.setTargetAtTime(staticGain(input.signalQuality, input.reducedDistortion, input.muted), now, 0.1);
    graph.engineOscillator.frequency.setTargetAtTime(engineFrequency(input.mode), now, 0.15);
    graph.engineNode.gain.setTargetAtTime(engineGain(input.mode, input.muted), now, 0.1);
    graph.chordNode.gain.setTargetAtTime(chordGain(input.signalQuality, input.muted), now, 0.4);
    if (heartbeatGain(input.tension, input.reducedDistortion, input.muted) === 0) stopHeartbeat();
    else if (heartbeatTimer === null) beat();
  }

  return {
    async resume() {
      graph ??= buildGraph();
      if (!graph) return;
      if (graph.context.state === 'suspended') await graph.context.resume();
      if (latest) apply(latest);
    },
    update(input) {
      latest = input;
      apply(input);
    },
    click() {
      if (!graph || !latest || latest.muted) return;
      const { context, master, noiseBuffer } = graph;
      const start = context.currentTime;
      const level = latest.reducedDistortion ? 0.09 : 0.18;
      const burst = context.createBufferSource();
      burst.buffer = noiseBuffer;
      const highpass = context.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 1800;
      const burstEnvelope = context.createGain();
      burstEnvelope.gain.setValueAtTime(level, start);
      burstEnvelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.05);
      burst.connect(highpass);
      highpass.connect(burstEnvelope);
      burstEnvelope.connect(master);
      burst.start(start, Math.random(), 0.06);

      const knock = context.createOscillator();
      const knockEnvelope = context.createGain();
      knock.type = 'square';
      knock.frequency.setValueAtTime(140, start);
      knockEnvelope.gain.setValueAtTime(level * 0.5, start);
      knockEnvelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.07);
      knock.connect(knockEnvelope);
      knockEnvelope.connect(master);
      knock.start(start);
      knock.stop(start + 0.08);
    },
    dispose() {
      stopHeartbeat();
      const current = graph;
      graph = null;
      latest = null;
      if (current) void current.context.close();
    },
  };
}
