/**
 * Procedural world audio (task 32.1). Zero assets, pure TypeScript: no React, no three.js,
 * no storage, no timers. Everything is synthesised with the Web Audio API.
 *
 * API
 *   createWorldAudioEngine(options?: { contextFactory?: () => AudioContextLike | null }) => WorldAudioEngine
 *
 *   unlock()            Call from a user gesture. Creates the context on the first call (factory, or
 *                       window.AudioContext / webkitAudioContext), resumes it when suspended and starts the
 *                       ambient bed (pad + tape hiss) once.
 *   setHidden(hidden)   true suspends the context; false resumes it (only if unlocked and not muted).
 *   setDucked(ducked)   Ramps the BGM bus to 0.4x (or back to 1x) over 0.35 s.
 *   setMuted(muted) / toggleMuted() / isMuted()   Master gain ramp to 0 / 1 (toggleMuted returns the new state).
 *   isUnlocked()
 *   tick(elapsedSec)    Schedules sparse bell notes up to LOOKAHEAD_SEC ahead of ctx.currentTime. The argument
 *                       is accepted for call-site symmetry; the audio clock is the only time source used.
 *                       Idempotent per beat. No-op when locked, muted, hidden or not running.
 *   playVhsInsertSfx() / playArcadeCoinSfx() / playLampSwitchSfx() / playPageRustleSfx()
 *   dispose()           Stops and disconnects every node, closes the context once, then every method is a no-op.
 *
 * Fallback: when no context can be created (no AudioContext, factory returns null or throws) every method
 * is a silent no-op and nothing throws.
 *
 * Node graph
 *   master gain (1) -> destination
 *   bgm gain (0.15) -> master      sfx gain (0.6) -> master
 *   pad: 5 chord notes x (sawtooth + triangle, detuned) -> padMix -> lowpass ~1100 Hz (slow LFO) -> bgm
 *        wow LFO (0.45 Hz, +-6 cents) -> every pad oscillator detune
 *   hiss: looping cached noise -> highpass 3500 Hz -> gain 0.008 -> bgm
 *   bells: note voices -> bellIn -> bgm (dry) and bellIn -> delay 0.38 s (feedback 0.3) -> wet 0.25 -> bgm
 *   SFX voices are short-lived: each oscillator or source is stopped with stop(t + dur) and disconnected on 'ended'.
 */

// ---------------------------------------------------------------------------
// Structural subset of the Web Audio API (lets tests inject a fake).
// ---------------------------------------------------------------------------

export interface AudioParamLike {
  value: number;
  setValueAtTime(value: number, time: number): unknown;
  linearRampToValueAtTime(value: number, time: number): unknown;
  exponentialRampToValueAtTime(value: number, time: number): unknown;
  cancelScheduledValues(time: number): unknown;
}

export interface AudioNodeLike {
  connect(destination: AudioNodeLike | AudioParamLike): unknown;
  disconnect(): void;
}

export interface GainNodeLike extends AudioNodeLike {
  gain: AudioParamLike;
}

export interface OscillatorNodeLike extends AudioNodeLike {
  type: string;
  frequency: AudioParamLike;
  detune: AudioParamLike;
  start(when?: number): void;
  stop(when?: number): void;
  onended: (() => void) | null;
}

export interface BiquadFilterNodeLike extends AudioNodeLike {
  type: string;
  frequency: AudioParamLike;
  Q: AudioParamLike;
}

export interface DelayNodeLike extends AudioNodeLike {
  delayTime: AudioParamLike;
}

export interface AudioBufferLike {
  getChannelData(channel: number): Float32Array;
}

export interface AudioBufferSourceNodeLike extends AudioNodeLike {
  buffer: AudioBufferLike | null;
  loop: boolean;
  start(when?: number, offset?: number): void;
  stop(when?: number): void;
  onended: (() => void) | null;
}

export interface AudioContextLike {
  readonly currentTime: number;
  readonly state: string;
  readonly destination: AudioNodeLike;
  readonly sampleRate: number;
  resume(): Promise<void> | void;
  suspend(): Promise<void> | void;
  close(): Promise<void> | void;
  createGain(): GainNodeLike;
  createOscillator(): OscillatorNodeLike;
  createBiquadFilter(): BiquadFilterNodeLike;
  createBufferSource(): AudioBufferSourceNodeLike;
  createBuffer(channels: number, length: number, sampleRate: number): AudioBufferLike;
  createDelay(maxDelayTime?: number): DelayNodeLike;
  createStereoPanner?(): AudioNodeLike & { pan: AudioParamLike };
}

export interface WorldAudioEngineOptions {
  contextFactory?: () => AudioContextLike | null;
  /** Reserved: the engine never reads wall-clock time. */
  now?: never;
}

export interface WorldAudioEngine {
  unlock(): void;
  setHidden(hidden: boolean): void;
  setDucked(ducked: boolean): void;
  setMuted(muted: boolean): void;
  toggleMuted(): boolean;
  isMuted(): boolean;
  isUnlocked(): boolean;
  tick(elapsedSec: number): void;
  playVhsInsertSfx(): void;
  playArcadeCoinSfx(): void;
  playLampSwitchSfx(): void;
  playPageRustleSfx(): void;
  dispose(): void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const AMBIENT_BPM = 78;
export const BEAT_SEC = 60 / AMBIENT_BPM;
export const LOOKAHEAD_SEC = 1.5;
export const BGM_BASE_GAIN = 0.15;
export const DUCK_FACTOR = 0.4;
export const DUCK_RAMP_SEC = 0.35;
export const MUTE_RAMP_SEC = 0.08;
export const SFX_BUS_GAIN = 0.6;
export const HISS_GAIN = 0.008;

/** D-Dorian pad voicing: D3 A3 C4 E4 G4 (MIDI note numbers). */
export const PAD_CHORD_MIDI: readonly number[] = [50, 57, 60, 64, 67];

/**
 * Bell pattern, one entry per even beat (a note every 2 beats at most). Entries are MIDI notes from
 * D-Dorian (D E F G A B C); -1 is a rest. The 16-entry cycle lasts 32 beats.
 */
export const BELL_PATTERN_MIDI: readonly number[] = [
  74, -1, 81, 77, -1, 79, -1, 72, 76, -1, -1, 81, 79, -1, 74, -1,
];

const MIN_GAIN = 0.0001;
const NOISE_SEED = 0x4c4d43;
const SFX_LEAD_SEC = 0.005;

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Deterministic PRNG (mulberry32) returning floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clampGain = (v: number): number => Math.min(1, Math.max(0, v));

function safeDisconnect(node: AudioNodeLike): void {
  try {
    node.disconnect();
  } catch {
    /* already disconnected */
  }
}

function swallow(result: Promise<void> | void): void {
  if (result && typeof (result as Promise<void>).catch === 'function') {
    (result as Promise<void>).catch(() => undefined);
  }
}

function defaultContextFactory(): AudioContextLike | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: new () => unknown;
    webkitAudioContext?: new () => unknown;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (typeof Ctor !== 'function') return null;
  return new Ctor() as unknown as AudioContextLike;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

interface Graph {
  ctx: AudioContextLike;
  master: GainNodeLike;
  bgm: GainNodeLike;
  sfx: GainNodeLike;
  bellIn: GainNodeLike;
  noise: AudioBufferLike;
}

type StoppableSource = (OscillatorNodeLike | AudioBufferSourceNodeLike) & { stop(when?: number): void };

interface ToneSpec {
  type: string;
  f0: number;
  f1?: number;
  t: number;
  dur: number;
  peak: number;
  attack?: number;
  /** Length of the final exponential fade. Defaults to the whole time after the attack (pure decay). */
  release?: number;
  dest: AudioNodeLike;
  extras?: AudioNodeLike[];
}

interface NoiseSpec {
  t: number;
  dur: number;
  peak: number;
  attack?: number;
  filterType: string;
  f0: number;
  f1?: number;
  q: number;
  dest: AudioNodeLike;
}

export function createWorldAudioEngine(options: WorldAudioEngineOptions = {}): WorldAudioEngine {
  const factory = options.contextFactory ?? defaultContextFactory;

  let g: Graph | null = null;
  let failed = false;
  let disposed = false;
  let unlocked = false;
  let muted = false;
  let hidden = false;
  let ducked = false;

  let ambientOrigin = 0;
  let nextBeat = 0;
  let noiseCursor = 0;

  const persistent: AudioNodeLike[] = [];
  const continuous: Array<{ stop(when?: number): void }> = [];
  const live = new Map<StoppableSource, AudioNodeLike[]>();

  // --- generic helpers ------------------------------------------------------

  function track(src: StoppableSource, extras: AudioNodeLike[]): void {
    live.set(src, extras);
    src.onended = () => {
      live.delete(src);
      safeDisconnect(src);
      for (const n of extras) safeDisconnect(n);
    };
  }

  function rampParam(param: AudioParamLike, target: number, durSec: number, now: number): void {
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(target, now + durSec);
  }

  function makeFilter(graph: Graph, type: string, freq: number, q: number): BiquadFilterNodeLike {
    const f = graph.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  function tone(graph: Graph, s: ToneSpec): OscillatorNodeLike {
    const { ctx } = graph;
    const osc = ctx.createOscillator();
    osc.type = s.type;
    osc.frequency.setValueAtTime(s.f0, s.t);
    if (s.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(s.f1, s.t + s.dur);

    const amp = ctx.createGain();
    const attack = s.attack ?? 0.004;
    const peak = clampGain(s.peak);
    const release = Math.min(s.release ?? s.dur - attack, s.dur - attack);
    amp.gain.setValueAtTime(MIN_GAIN, s.t);
    amp.gain.linearRampToValueAtTime(peak, s.t + attack);
    if (release < s.dur - attack - 1e-6) amp.gain.setValueAtTime(peak, s.t + s.dur - release);
    amp.gain.exponentialRampToValueAtTime(MIN_GAIN, s.t + s.dur);

    osc.connect(amp);
    amp.connect(s.dest);
    track(osc, [amp, ...(s.extras ?? [])]);
    osc.start(s.t);
    osc.stop(s.t + s.dur);
    return osc;
  }

  function noiseBurst(graph: Graph, s: NoiseSpec): AudioBufferSourceNodeLike {
    const { ctx } = graph;
    const src = ctx.createBufferSource();
    src.buffer = graph.noise;
    src.loop = false;

    const filter = makeFilter(graph, s.filterType, s.f0, s.q);
    filter.frequency.setValueAtTime(s.f0, s.t);
    if (s.f1 !== undefined) filter.frequency.exponentialRampToValueAtTime(s.f1, s.t + s.dur);

    const amp = ctx.createGain();
    const attack = s.attack ?? 0.003;
    amp.gain.setValueAtTime(MIN_GAIN, s.t);
    amp.gain.linearRampToValueAtTime(clampGain(s.peak), s.t + attack);
    amp.gain.exponentialRampToValueAtTime(MIN_GAIN, s.t + s.dur);

    src.connect(filter);
    filter.connect(amp);
    amp.connect(s.dest);
    track(src, [filter, amp]);

    // Deterministic start offset inside the cached 1 s buffer (max 0.5 s; bursts are shorter).
    noiseCursor = (noiseCursor + 0.173) % 0.5;
    src.start(s.t, noiseCursor);
    src.stop(s.t + s.dur);
    return src;
  }

  // --- graph construction -----------------------------------------------------

  function buildNoiseBuffer(ctx: AudioContextLike): AudioBufferLike {
    const length = Math.max(1, Math.floor(ctx.sampleRate));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const rand = mulberry32(NOISE_SEED);
    for (let i = 0; i < data.length; i += 1) data[i] = rand() * 2 - 1;
    return buffer;
  }

  function startContinuous(src: OscillatorNodeLike | AudioBufferSourceNodeLike, when: number): void {
    src.start(when);
    continuous.push(src);
    persistent.push(src);
  }

  function startAmbient(graph: Graph): void {
    const { ctx, bgm } = graph;
    const t0 = ctx.currentTime;
    ambientOrigin = t0;
    nextBeat = 0;

    // Pad: detuned sawtooth + triangle per chord note, through a slowly modulated low-pass.
    const padFilter = makeFilter(graph, 'lowpass', 1100, 0.5);
    const padMix = ctx.createGain();
    padMix.gain.value = 0.045;
    padMix.connect(padFilter);
    padFilter.connect(bgm);
    persistent.push(padFilter, padMix);

    const filterLfo = ctx.createOscillator();
    filterLfo.type = 'sine';
    filterLfo.frequency.value = 0.07;
    const filterLfoDepth = ctx.createGain();
    filterLfoDepth.gain.value = 220;
    filterLfo.connect(filterLfoDepth);
    filterLfoDepth.connect(padFilter.frequency);
    persistent.push(filterLfoDepth);
    startContinuous(filterLfo, t0);

    const wow = ctx.createOscillator();
    wow.type = 'sine';
    wow.frequency.value = 0.45;
    const wowDepth = ctx.createGain();
    wowDepth.gain.value = 6; // cents of tape-wow pitch drift
    wow.connect(wowDepth);
    persistent.push(wowDepth);
    startContinuous(wow, t0);

    for (const midi of PAD_CHORD_MIDI) {
      const hz = midiToHz(midi);
      const voices: Array<[string, number]> = [
        ['sawtooth', 5],
        ['triangle', -5],
      ];
      for (const [type, cents] of voices) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = hz;
        osc.detune.value = cents;
        osc.connect(padMix);
        wowDepth.connect(osc.detune);
        startContinuous(osc, t0);
      }
    }

    // Tape hiss bed: looping cached noise, very quiet.
    const hiss = ctx.createBufferSource();
    hiss.buffer = graph.noise;
    hiss.loop = true;
    const hissFilter = makeFilter(graph, 'highpass', 3500, 0.7);
    const hissGain = ctx.createGain();
    hissGain.gain.value = HISS_GAIN;
    hiss.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(bgm);
    persistent.push(hissFilter, hissGain);
    startContinuous(hiss, t0);
  }

  function build(ctx: AudioContextLike): Graph {
    // Creation order matters to tests: master, bgm, sfx.
    const master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    const bgm = ctx.createGain();
    bgm.gain.value = BGM_BASE_GAIN * (ducked ? DUCK_FACTOR : 1);
    bgm.connect(master);
    const sfx = ctx.createGain();
    sfx.gain.value = SFX_BUS_GAIN;
    sfx.connect(master);

    const bellIn = ctx.createGain();
    bellIn.gain.value = 1;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.38;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    const wet = ctx.createGain();
    wet.gain.value = 0.25;
    bellIn.connect(bgm);
    bellIn.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(bgm);

    persistent.push(master, bgm, sfx, bellIn, delay, feedback, wet);
    return { ctx, master, bgm, sfx, bellIn, noise: buildNoiseBuffer(ctx) };
  }

  function teardownAfterFailure(): void {
    const ctx = g?.ctx;
    g = null;
    unlocked = false;
    failed = true;
    for (const n of persistent) safeDisconnect(n);
    persistent.length = 0;
    continuous.length = 0;
    if (ctx) {
      try {
        swallow(ctx.close());
      } catch {
        /* ignore */
      }
    }
  }

  // --- public API -------------------------------------------------------------

  function unlock(): void {
    if (disposed || failed) return;
    if (!g) {
      let ctx: AudioContextLike | null = null;
      try {
        ctx = factory();
      } catch {
        ctx = null;
      }
      if (!ctx) {
        failed = true;
        return;
      }
      try {
        g = build(ctx);
        unlocked = true;
        startAmbient(g);
      } catch {
        if (!g) {
          // build() failed before the graph was stored: close the context directly.
          try {
            swallow(ctx.close());
          } catch {
            /* ignore */
          }
          failed = true;
          unlocked = false;
          return;
        }
        teardownAfterFailure();
        return;
      }
    }
    try {
      if (!hidden && g.ctx.state === 'suspended') swallow(g.ctx.resume());
    } catch {
      /* resume can be rejected by the browser; the next gesture retries */
    }
  }

  function setHidden(value: boolean): void {
    hidden = value;
    if (!g || disposed || !unlocked) return;
    try {
      if (value) {
        if (g.ctx.state === 'running') swallow(g.ctx.suspend());
      } else if (!muted && g.ctx.state === 'suspended') {
        swallow(g.ctx.resume());
      }
    } catch {
      /* ignore */
    }
  }

  function setDucked(value: boolean): void {
    ducked = value;
    if (!g || disposed) return;
    rampParam(g.bgm.gain, BGM_BASE_GAIN * (value ? DUCK_FACTOR : 1), DUCK_RAMP_SEC, g.ctx.currentTime);
  }

  function setMuted(value: boolean): void {
    muted = value;
    if (!g || disposed) return;
    rampParam(g.master.gain, value ? 0 : 1, MUTE_RAMP_SEC, g.ctx.currentTime);
    if (!value && !hidden && unlocked && g.ctx.state === 'suspended') {
      try {
        swallow(g.ctx.resume());
      } catch {
        /* ignore */
      }
    }
  }

  function toggleMuted(): boolean {
    setMuted(!muted);
    return muted;
  }

  function tick(_elapsedSec: number): void {
    if (!g || disposed || !unlocked || muted || hidden) return;
    const { ctx, bellIn } = g;
    if (ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const first = Math.max(Math.ceil((now - ambientOrigin) / BEAT_SEC - 1e-9), nextBeat);
    const last = Math.floor((now + LOOKAHEAD_SEC - ambientOrigin) / BEAT_SEC);
    if (last < first) return;

    for (let beat = first; beat <= last; beat += 1) {
      if (beat % 2 !== 0) continue;
      const midi = BELL_PATTERN_MIDI[(beat / 2) % BELL_PATTERN_MIDI.length];
      if (midi < 0) continue;
      const t = Math.max(now, ambientOrigin + beat * BEAT_SEC);
      const hz = midiToHz(midi);
      tone(g, { type: 'sine', f0: hz, t, dur: 1.2, peak: 0.5, attack: 0.005, dest: bellIn });
      tone(g, { type: 'sine', f0: hz * 2, t, dur: 0.9, peak: 0.14, attack: 0.004, dest: bellIn });
      tone(g, { type: 'sine', f0: hz * 3, t, dur: 0.6, peak: 0.07, attack: 0.003, dest: bellIn });
    }
    nextBeat = last + 1;
  }

  /** Returns the graph when an SFX may be scheduled now, else null. */
  function sfxGraph(): Graph | null {
    if (!g || disposed || !unlocked || muted || hidden) return null;
    if (g.ctx.state === 'closed') return null;
    return g;
  }

  function playVhsInsertSfx(): void {
    const graph = sfxGraph();
    if (!graph) return;
    const t = graph.ctx.currentTime + SFX_LEAD_SEC;
    const { sfx } = graph;

    // Cassette-slot clunk: triangle punch 115 -> 42 Hz through a low-pass.
    const clunkLp = makeFilter(graph, 'lowpass', 420, 0.7);
    clunkLp.connect(sfx);
    tone(graph, { type: 'triangle', f0: 115, f1: 42, t, dur: 0.12, peak: 0.9, attack: 0.003, dest: clunkLp, extras: [clunkLp] });

    // Latch click.
    tone(graph, { type: 'square', f0: 1850, t: t + 0.1, dur: 0.015, peak: 0.2, attack: 0.002, dest: sfx });

    // VCR motor tape-load whir: triangle + quieter sawtooth, 210 -> 290 Hz, soft attack and release.
    const whirLp = makeFilter(graph, 'lowpass', 1400, 0.7);
    whirLp.connect(sfx);
    const tw = t + 0.14;
    tone(graph, { type: 'triangle', f0: 210, f1: 290, t: tw, dur: 0.72, peak: 0.22, attack: 0.1, release: 0.2, dest: whirLp, extras: [whirLp] });
    tone(graph, { type: 'sawtooth', f0: 210, f1: 290, t: tw, dur: 0.72, peak: 0.07, attack: 0.1, release: 0.2, dest: whirLp });

    // CRT static hiss burst, about 0.45 s.
    noiseBurst(graph, { t: t + 0.8, dur: 0.45, peak: 0.14, attack: 0.01, filterType: 'bandpass', f0: 3000, q: 0.8, dest: sfx });
  }

  function playArcadeCoinSfx(): void {
    const graph = sfxGraph();
    if (!graph) return;
    const t = graph.ctx.currentTime + SFX_LEAD_SEC;
    const { sfx } = graph;

    // Metallic double ping: 2450 Hz, then 3680 Hz 48 ms later.
    tone(graph, { type: 'sine', f0: 2450, t, dur: 0.12, peak: 0.3, attack: 0.002, dest: sfx });
    tone(graph, { type: 'sine', f0: 3680, t: t + 0.048, dur: 0.12, peak: 0.26, attack: 0.002, dest: sfx });

    // Credit-accepted chime: B5 -> E6, 0.14 s each, 0.28 s in total.
    const chimeLp = makeFilter(graph, 'lowpass', 4200, 0.7);
    chimeLp.connect(sfx);
    const tc = t + 0.1;
    tone(graph, { type: 'square', f0: 987.77, t: tc, dur: 0.14, peak: 0.12, attack: 0.004, dest: chimeLp, extras: [chimeLp] });
    tone(graph, { type: 'square', f0: 1318.51, t: tc + 0.14, dur: 0.14, peak: 0.12, attack: 0.004, dest: chimeLp });
  }

  function playLampSwitchSfx(): void {
    const graph = sfxGraph();
    if (!graph) return;
    const t = graph.ctx.currentTime + SFX_LEAD_SEC;
    noiseBurst(graph, { t, dur: 0.035, peak: 0.45, attack: 0.001, filterType: 'highpass', f0: 2000, q: 0.7, dest: graph.sfx });
    tone(graph, { type: 'sine', f0: 3000, t, dur: 0.02, peak: 0.18, attack: 0.001, dest: graph.sfx });
  }

  function playPageRustleSfx(): void {
    const graph = sfxGraph();
    if (!graph) return;
    const t = graph.ctx.currentTime + SFX_LEAD_SEC;
    noiseBurst(graph, { t, dur: 0.085, peak: 0.25, attack: 0.015, filterType: 'bandpass', f0: 1200, f1: 3000, q: 1.2, dest: graph.sfx });
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    unlocked = false;
    const graph = g;
    g = null;
    if (!graph) return;
    for (const src of continuous) {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    }
    for (const [src, extras] of live) {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
      safeDisconnect(src);
      for (const n of extras) safeDisconnect(n);
    }
    live.clear();
    for (const n of persistent) safeDisconnect(n);
    persistent.length = 0;
    continuous.length = 0;
    try {
      swallow(graph.ctx.close());
    } catch {
      /* ignore */
    }
  }

  return {
    unlock,
    setHidden,
    setDucked,
    setMuted,
    toggleMuted,
    isMuted: () => muted,
    isUnlocked: () => unlocked,
    tick,
    playVhsInsertSfx,
    playArcadeCoinSfx,
    playLampSwitchSfx,
    playPageRustleSfx,
    dispose,
  };
}
