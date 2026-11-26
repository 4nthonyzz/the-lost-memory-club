/**
 * Procedural world audio (tasks 32.1 and 33.2). Zero assets, pure TypeScript: no React, no three.js,
 * no storage, no timers. Everything is synthesised with the Web Audio API.
 *
 * API
 *   createWorldAudioEngine(options?: { contextFactory?: () => AudioContextLike | null }) => WorldAudioEngine
 *
 *   unlock()            Call from a user gesture. Creates the context on the first call (factory, or
 *                       window.AudioContext / webkitAudioContext), resumes it when suspended and starts the
 *                       selected music track (default track 0) once.
 *   setHidden(hidden)   true suspends the context; false resumes it (only if unlocked and not muted).
 *   setDucked(ducked)   Ramps the BGM bus to 0.4x (or back to 1x) over 0.35 s.
 *   setMuted(muted) / toggleMuted() / isMuted()   Master gain ramp to 0 / 1 (toggleMuted returns the new state).
 *   isUnlocked()
 *   setTrack(index)     Selects a MUSIC_CATALOG entry (0..4). Invalid indices (non-integer, out of range) are
 *                       ignored; selecting the active track is a no-op. Before unlock the selection is stored
 *                       and applied on unlock. After unlock the switch is an audio-clock crossfade of
 *                       CROSSFADE_SEC: the old track bus ramps to 0 and its voices are stopped with stop(end)
 *                       and disconnected, the new track bus ramps from 0 to 1. Track 4 is silent (no music).
 *   getTrack()          Selected track index (0 by default). Mute does not change it.
 *   isPlaying()         true when a music track 0..3 is selected and the engine is unlocked. Mute, duck and
 *                       hidden do not change it (the selection is playing but may be inaudible).
 *   tick(elapsedSec)    Schedules the active track's notes up to LOOKAHEAD_SEC ahead of ctx.currentTime. The
 *                       argument is accepted for call-site symmetry; the audio clock is the only time source.
 *                       Idempotent per step, no backlog after a time jump. No-op when locked, muted, hidden,
 *                       not running or when track 4 is selected.
 *   playVhsInsertSfx() / playArcadeCoinSfx() / playLampSwitchSfx() / playPageRustleSfx() /
 *   playVinylNeedleDropSfx()
 *   dispose()           Stops and disconnects every node, closes the context once, then every method is a no-op.
 *
 * Fallback: when no context can be created (no AudioContext, factory returns null or throws) every method
 * is a silent no-op and nothing throws.
 *
 * Node graph
 *   master gain (1) -> destination
 *   bgm gain (0.15) -> master      sfx gain (0.6) -> master
 *   one track bus gain per started track -> bgm (crossfaded); every track voice ends in its track bus.
 *   track 0: pad: 5 chord notes x (sawtooth + triangle, detuned) -> padMix -> lowpass ~1100 Hz (slow LFO)
 *              wow LFO (0.45 Hz, +-6 cents) -> every pad oscillator detune
 *            hiss: looping cached noise -> highpass 3500 Hz -> gain 0.008
 *            bells: note voices -> bellIn -> bus (dry) and bellIn -> delay 0.38 s (feedback 0.3) -> wet 0.25 -> bus
 *            Its continuous nodes (pad, LFOs, hiss) are stopped when the track is left and RECREATED when it is
 *            selected again (simplest correct approach: no node is ever reused across a fade).
 *   track 1: two-operator FM chord stabs (+ bass lowpass pulse)       track 2: Rhodes-style chords + vinyl crackle
 *   track 3: sawtooth arpeggio -> lowpass -> feedback delay + soft pad
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
  /** Selects a MUSIC_CATALOG index (0..4). Invalid indices are ignored; the same track is a no-op. */
  setTrack(index: number): void;
  /** Selected track index (default 0). Unaffected by mute. */
  getTrack(): number;
  /** True when a music track 0..3 is selected and the engine is unlocked (mute does not change this). */
  isPlaying(): boolean;
  tick(elapsedSec: number): void;
  playVhsInsertSfx(): void;
  playArcadeCoinSfx(): void;
  playLampSwitchSfx(): void;
  playPageRustleSfx(): void;
  playVinylNeedleDropSfx(): void;
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
/** Audio-clock crossfade length when the track changes. */
export const CROSSFADE_SEC = 0.7;

export interface MusicCatalogEntry {
  readonly id: string;
  readonly title: string;
  readonly year: number;
  readonly bpm: number;
  readonly description: string;
}

export const MUSIC_CATALOG: readonly MusicCatalogEntry[] = Object.freeze([
  Object.freeze({
    id: 'midnight-rental',
    title: '01 // MIDNIGHT RENTAL (1994)',
    year: 1994,
    bpm: 78,
    description: 'D-Dorian tape pad with slow filter drift, tape hiss and sparse delayed bells.',
  }),
  Object.freeze({
    id: 'neon-arcade-lobby',
    title: '02 // NEON ARCADE LOBBY (1996)',
    year: 1996,
    bpm: 92,
    description: 'Upbeat FM-synth chord stabs over a warm analog bass pulse.',
  }),
  Object.freeze({
    id: 'rain-on-crt-glass',
    title: '03 // RAIN ON CRT GLASS (1997)',
    year: 1997,
    bpm: 72,
    description: 'Melancholic lo-fi electric-piano chords under soft vinyl crackle.',
  }),
  Object.freeze({
    id: 'static-and-starlight',
    title: '04 // STATIC & STARLIGHT (1998)',
    year: 1998,
    bpm: 84,
    description: 'Dreamy A-minor synth-wave arpeggio through a feedback delay.',
  }),
  Object.freeze({
    id: 'stop-turntable',
    title: '05 // STOP TURNTABLE (SILENT)',
    year: 0,
    bpm: 0,
    description: 'No music. Room sounds only.',
  }),
]);

/** Titles in catalog order, for the turntable card. */
export const MUSIC_TITLES: readonly string[] = Object.freeze(MUSIC_CATALOG.map((e) => e.title));
export const MUSIC_TRACK_COUNT = MUSIC_CATALOG.length;
/** Index of the silent entry. */
export const SILENT_TRACK = 4;

/** D-Dorian pad voicing: D3 A3 C4 E4 G4 (MIDI note numbers). */
export const PAD_CHORD_MIDI: readonly number[] = [50, 57, 60, 64, 67];

/**
 * Bell pattern, one entry per even beat (a note every 2 beats at most). Entries are MIDI notes from
 * D-Dorian (D E F G A B C); -1 is a rest. The 16-entry cycle lasts 32 beats.
 */
export const BELL_PATTERN_MIDI: readonly number[] = [
  74, -1, 81, 77, -1, 79, -1, 72, 76, -1, -1, 81, 79, -1, 74, -1,
];

interface ChordDef {
  readonly notes: readonly number[];
  readonly root: number;
}

/** Track 1, one chord per bar: Am7 - Fmaj7 - Cmaj7 - G6. */
const FM_CHORDS: readonly ChordDef[] = [
  { notes: [57, 60, 64, 67], root: 45 },
  { notes: [53, 57, 60, 64], root: 41 },
  { notes: [60, 64, 67, 71], root: 48 },
  { notes: [55, 59, 62, 64], root: 43 },
];

/** Track 2, two bars each: Fmaj7 then Em9. */
const RHODES_CHORDS: readonly (readonly number[])[] = [
  [53, 57, 60, 64],
  [52, 55, 59, 62, 66],
];

/** Track 3 arpeggio, one 4-note pattern per bar, played twice per bar as eighth notes. */
const ARP_PATTERNS: readonly (readonly number[])[] = [
  [57, 60, 64, 69],
  [53, 57, 60, 65],
  [60, 64, 67, 72],
  [55, 59, 62, 67],
];

const SOFT_PAD_MIDI: readonly number[] = [45, 52, 57, 60];

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

/** Deterministic hash of a step number to [0, 1). */
function stepHash(n: number): number {
  let x = (Math.imul(n + 1, 0x9e3779b1) ^ NOISE_SEED) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
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
  noise: AudioBufferLike;
}

type StoppableSource = (OscillatorNodeLike | AudioBufferSourceNodeLike) & { stop(when?: number): void };

/** Everything one started music track owns. */
interface TrackState {
  index: number;
  bus: GainNodeLike;
  /** Non-source nodes (gains, filters, delays) disconnected when the track is cleaned up. */
  nodes: AudioNodeLike[];
  /** Live voices of this track with their scheduled stop time (Infinity for continuous voices). */
  voices: Map<StoppableSource, number>;
  origin: number;
  nextStep: number;
  stepSec: number;
  retiring: boolean;
  endAt: number;
  /** Primary note input (bells, chords, arpeggio, Rhodes). */
  dest: GainNodeLike | null;
  /** Secondary input (bass filter, crackle gain). */
  dest2: AudioNodeLike | null;
  /** Pitch-LFO depth node (cents) feeding note detune params. */
  wow: GainNodeLike | null;
}

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
  owner?: TrackState;
  /** Node whose output is added to the oscillator detune (pitch LFO). */
  detuneSrc?: AudioNodeLike;
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
  owner?: TrackState;
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
  let selected = 0;
  let active: TrackState | null = null;
  let noiseCursor = 0;

  const persistent: AudioNodeLike[] = [];
  const states = new Set<TrackState>();
  const live = new Map<StoppableSource, AudioNodeLike[]>();

  // --- generic helpers ------------------------------------------------------

  function cleanupTrack(st: TrackState): void {
    for (const n of st.nodes) safeDisconnect(n);
    safeDisconnect(st.bus);
    st.nodes.length = 0;
    states.delete(st);
  }

  function track(src: StoppableSource, extras: AudioNodeLike[], owner: TrackState | undefined, stopAt: number): void {
    live.set(src, extras);
    owner?.voices.set(src, stopAt);
    src.onended = () => {
      live.delete(src);
      safeDisconnect(src);
      for (const n of extras) safeDisconnect(n);
      if (owner) {
        owner.voices.delete(src);
        if (owner.retiring && owner.voices.size === 0) cleanupTrack(owner);
      }
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
    if (s.detuneSrc) s.detuneSrc.connect(osc.detune);
    track(osc, [amp, ...(s.extras ?? [])], s.owner, s.t + s.dur);
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
    track(src, [filter, amp], s.owner, s.t + s.dur);

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

  function startContinuous(st: TrackState, src: OscillatorNodeLike | AudioBufferSourceNodeLike, when: number): void {
    src.start(when);
    track(src, [], st, Infinity);
  }

  function makeTrackNode<T extends AudioNodeLike>(st: TrackState, node: T): T {
    st.nodes.push(node);
    return node;
  }

  function buildAmbient(graph: Graph, st: TrackState): void {
    const { ctx } = graph;
    const t0 = ctx.currentTime;

    // Pad: detuned sawtooth + triangle per chord note, through a slowly modulated low-pass.
    const padFilter = makeTrackNode(st, makeFilter(graph, 'lowpass', 1100, 0.5));
    const padMix = makeTrackNode(st, ctx.createGain());
    padMix.gain.value = 0.045;
    padMix.connect(padFilter);
    padFilter.connect(st.bus);

    const filterLfo = ctx.createOscillator();
    filterLfo.type = 'sine';
    filterLfo.frequency.value = 0.07;
    const filterLfoDepth = makeTrackNode(st, ctx.createGain());
    filterLfoDepth.gain.value = 220;
    filterLfo.connect(filterLfoDepth);
    filterLfoDepth.connect(padFilter.frequency);
    startContinuous(st, filterLfo, t0);

    const wow = ctx.createOscillator();
    wow.type = 'sine';
    wow.frequency.value = 0.45;
    const wowDepth = makeTrackNode(st, ctx.createGain());
    wowDepth.gain.value = 6; // cents of tape-wow pitch drift
    wow.connect(wowDepth);
    startContinuous(st, wow, t0);

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
        startContinuous(st, osc, t0);
      }
    }

    // Tape hiss bed: looping cached noise, very quiet.
    const hiss = ctx.createBufferSource();
    hiss.buffer = graph.noise;
    hiss.loop = true;
    const hissFilter = makeTrackNode(st, makeFilter(graph, 'highpass', 3500, 0.7));
    const hissGain = makeTrackNode(st, ctx.createGain());
    hissGain.gain.value = HISS_GAIN;
    hiss.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(st.bus);
    startContinuous(st, hiss, t0);

    // Bells: dry into the bus plus a feedback delay.
    const bellIn = makeTrackNode(st, ctx.createGain());
    bellIn.gain.value = 1;
    const delay = makeTrackNode(st, ctx.createDelay(1));
    delay.delayTime.value = 0.38;
    const feedback = makeTrackNode(st, ctx.createGain());
    feedback.gain.value = 0.3;
    const wet = makeTrackNode(st, ctx.createGain());
    wet.gain.value = 0.25;
    bellIn.connect(st.bus);
    bellIn.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(st.bus);
    st.dest = bellIn;
  }

  function buildFmLobby(graph: Graph, st: TrackState): void {
    const { ctx } = graph;
    const chordBus = makeTrackNode(st, ctx.createGain());
    chordBus.gain.value = 0.8;
    chordBus.connect(st.bus);
    const bassFilter = makeTrackNode(st, makeFilter(graph, 'lowpass', 420, 1.1));
    bassFilter.connect(st.bus);
    st.dest = chordBus;
    st.dest2 = bassFilter;
  }

  function buildRhodes(graph: Graph, st: TrackState): void {
    const { ctx } = graph;
    const t0 = ctx.currentTime;
    // Chord bus doubles as the tremolo gain: base 0.85, LFO +-0.12 at 4.5 Hz.
    const chordBus = makeTrackNode(st, ctx.createGain());
    chordBus.gain.value = 0.85;
    const chordLp = makeTrackNode(st, makeFilter(graph, 'lowpass', 2400, 0.6));
    chordBus.connect(chordLp);
    chordLp.connect(st.bus);
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 4.5;
    const lfoDepth = makeTrackNode(st, ctx.createGain());
    lfoDepth.gain.value = 0.12;
    lfo.connect(lfoDepth);
    lfoDepth.connect(chordBus.gain);
    startContinuous(st, lfo, t0);
    const crackleGain = makeTrackNode(st, ctx.createGain());
    crackleGain.gain.value = 0.6;
    crackleGain.connect(st.bus);
    st.dest = chordBus;
    st.dest2 = crackleGain;
  }

  function buildArp(graph: Graph, st: TrackState): void {
    const { ctx } = graph;
    const t0 = ctx.currentTime;
    const beat = 60 / 84;

    const arpIn = makeTrackNode(st, ctx.createGain());
    const arpLp = makeTrackNode(st, makeFilter(graph, 'lowpass', 2400, 0.6));
    arpIn.connect(arpLp);
    arpLp.connect(st.bus);
    // Dotted-eighth feedback delay.
    const delay = makeTrackNode(st, ctx.createDelay(1));
    delay.delayTime.value = beat * 0.75;
    const feedback = makeTrackNode(st, ctx.createGain());
    feedback.gain.value = 0.4;
    const wet = makeTrackNode(st, ctx.createGain());
    wet.gain.value = 0.35;
    arpLp.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(st.bus);

    // Gentle tape wow: pitch LFO (cents) on arp and pad voices.
    const wow = ctx.createOscillator();
    wow.type = 'sine';
    wow.frequency.value = 0.5;
    const wowDepth = makeTrackNode(st, ctx.createGain());
    wowDepth.gain.value = 8;
    wow.connect(wowDepth);
    startContinuous(st, wow, t0);

    // Soft A-minor pad.
    const padMix = makeTrackNode(st, ctx.createGain());
    padMix.gain.value = 0.05;
    const padLp = makeTrackNode(st, makeFilter(graph, 'lowpass', 700, 0.5));
    padMix.connect(padLp);
    padLp.connect(st.bus);
    for (const midi of SOFT_PAD_MIDI) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = midiToHz(midi);
      osc.connect(padMix);
      wowDepth.connect(osc.detune);
      startContinuous(st, osc, t0);
    }
    st.dest = arpIn;
    st.wow = wowDepth;
  }

  function startTrack(graph: Graph, index: number, fadeIn: boolean): TrackState | null {
    if (index < 0 || index >= SILENT_TRACK) return null;
    const { ctx } = graph;
    const now = ctx.currentTime;
    const beat = 60 / MUSIC_CATALOG[index].bpm;
    const bus = ctx.createGain();
    bus.connect(graph.bgm);
    if (fadeIn) {
      bus.gain.value = 0;
      bus.gain.setValueAtTime(0, now);
      bus.gain.linearRampToValueAtTime(1, now + CROSSFADE_SEC);
    } else {
      bus.gain.value = 1;
    }
    const stepSec = index === 0 ? beat : index === 2 ? beat / 4 : beat / 2;
    const st: TrackState = {
      index,
      bus,
      nodes: [],
      voices: new Map(),
      origin: now,
      nextStep: 0,
      stepSec,
      retiring: false,
      endAt: 0,
      dest: null,
      dest2: null,
      wow: null,
    };
    states.add(st);
    if (index === 0) buildAmbient(graph, st);
    else if (index === 1) buildFmLobby(graph, st);
    else if (index === 2) buildRhodes(graph, st);
    else buildArp(graph, st);
    return st;
  }

  /** Fades a track out over the crossfade window and stops its voices at the end of it. */
  function retireTrack(st: TrackState, now: number): void {
    const end = now + CROSSFADE_SEC;
    st.retiring = true;
    st.endAt = end;
    rampParam(st.bus.gain, 0, CROSSFADE_SEC, now);
    for (const [src, stopAt] of st.voices) {
      if (stopAt > end) {
        src.stop(end);
        st.voices.set(src, end);
      }
    }
  }

  /** Disconnects retired tracks that have no voices left (their 'ended' events may never have fired). */
  function sweepRetired(now: number): void {
    for (const st of Array.from(states)) {
      if (st.retiring && st.voices.size === 0 && now >= st.endAt) cleanupTrack(st);
    }
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

    persistent.push(master, bgm, sfx);
    return { ctx, master, bgm, sfx, noise: buildNoiseBuffer(ctx) };
  }

  function teardownAfterFailure(): void {
    const ctx = g?.ctx;
    g = null;
    active = null;
    unlocked = false;
    failed = true;
    for (const n of persistent) safeDisconnect(n);
    persistent.length = 0;
    for (const st of Array.from(states)) cleanupTrack(st);
    live.clear();
    if (ctx) {
      try {
        swallow(ctx.close());
      } catch {
        /* ignore */
      }
    }
  }

  // --- per-track note scheduling -------------------------------------------------

  function fmNote(graph: Graph, st: TrackState, hz: number, t: number, dur: number, peak: number): void {
    const { ctx } = graph;
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = hz;
    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = hz * 2; // 2:1 ratio
    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(hz * 1.8, t); // modulation depth in Hz, decays quickly
    modGain.gain.exponentialRampToValueAtTime(hz * 0.15, t + dur * 0.8);
    mod.connect(modGain);
    modGain.connect(carrier.frequency);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(MIN_GAIN, t);
    amp.gain.linearRampToValueAtTime(clampGain(peak), t + 0.008);
    amp.gain.exponentialRampToValueAtTime(MIN_GAIN, t + dur);
    carrier.connect(amp);
    amp.connect(st.dest as GainNodeLike);

    track(mod, [modGain], st, t + dur);
    track(carrier, [amp], st, t + dur);
    mod.start(t);
    mod.stop(t + dur);
    carrier.start(t);
    carrier.stop(t + dur);
  }

  function scheduleBell(graph: Graph, st: TrackState, step: number, t: number): void {
    if (step % 2 !== 0) return;
    const midi = BELL_PATTERN_MIDI[(step / 2) % BELL_PATTERN_MIDI.length];
    if (midi < 0) return;
    const hz = midiToHz(midi);
    const dest = st.dest as GainNodeLike;
    tone(graph, { type: 'sine', f0: hz, t, dur: 1.2, peak: 0.5, attack: 0.005, dest, owner: st });
    tone(graph, { type: 'sine', f0: hz * 2, t, dur: 0.9, peak: 0.14, attack: 0.004, dest, owner: st });
    tone(graph, { type: 'sine', f0: hz * 3, t, dur: 0.6, peak: 0.07, attack: 0.003, dest, owner: st });
  }

  function scheduleFm(graph: Graph, st: TrackState, step: number, t: number): void {
    const chord = FM_CHORDS[Math.floor(step / 8) % FM_CHORDS.length];
    const inBar = step % 8;
    if (inBar === 0 || inBar === 3 || inBar === 6) {
      for (const midi of chord.notes) fmNote(graph, st, midiToHz(midi), t, inBar === 0 ? 0.55 : 0.4, 0.09);
    }
    if (inBar === 0 || inBar === 4) {
      tone(graph, {
        type: 'sawtooth',
        f0: midiToHz(chord.root),
        t,
        dur: 0.55,
        peak: 0.5,
        attack: 0.012,
        dest: st.dest2 as AudioNodeLike,
        owner: st,
      });
    }
  }

  function scheduleRhodes(graph: Graph, st: TrackState, step: number, t: number): void {
    const dest = st.dest as GainNodeLike;
    if (step % 16 === 0) {
      const chord = RHODES_CHORDS[Math.floor(step / 32) % RHODES_CHORDS.length];
      for (const midi of chord) {
        const hz = midiToHz(midi);
        tone(graph, { type: 'sine', f0: hz, t, dur: 3.4, peak: 0.16, attack: 0.006, dest, owner: st });
        tone(graph, { type: 'sine', f0: hz * 2, t, dur: 1.8, peak: 0.05, attack: 0.005, dest, owner: st });
        tone(graph, { type: 'sine', f0: hz * 4, t, dur: 0.25, peak: 0.03, attack: 0.002, dest, owner: st });
      }
    }
    // Vinyl crackle: sparse short clicks chosen by a hash of the sixteenth-note index.
    const h = stepHash(step);
    if (h < 0.16) {
      noiseBurst(graph, {
        t,
        dur: 0.012,
        peak: 0.05 + h * 0.4,
        attack: 0.001,
        filterType: 'highpass',
        f0: 4000,
        q: 0.7,
        dest: st.dest2 as AudioNodeLike,
        owner: st,
      });
    }
  }

  function scheduleArp(graph: Graph, st: TrackState, step: number, t: number): void {
    const pattern = ARP_PATTERNS[Math.floor(step / 8) % ARP_PATTERNS.length];
    tone(graph, {
      type: 'sawtooth',
      f0: midiToHz(pattern[step % 4]),
      t,
      dur: 0.42,
      peak: 0.16,
      attack: 0.01,
      dest: st.dest as GainNodeLike,
      owner: st,
      detuneSrc: st.wow ?? undefined,
    });
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
        active = startTrack(g, selected, false);
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

  function setTrack(index: number): void {
    if (disposed) return;
    if (!Number.isInteger(index) || index < 0 || index >= MUSIC_TRACK_COUNT) return;
    if (index === selected) return;
    selected = index;
    if (!g || !unlocked) return; // applied on unlock
    try {
      const now = g.ctx.currentTime;
      if (active) retireTrack(active, now);
      active = startTrack(g, index, true);
    } catch {
      active = null;
    }
  }

  function tick(_elapsedSec: number): void {
    if (!g || disposed || !unlocked) return;
    sweepRetired(g.ctx.currentTime);
    if (muted || hidden || !active) return;
    const { ctx } = g;
    if (ctx.state !== 'running') return;

    const st = active;
    const now = ctx.currentTime;
    const first = Math.max(Math.ceil((now - st.origin) / st.stepSec - 1e-9), st.nextStep);
    const last = Math.floor((now + LOOKAHEAD_SEC - st.origin) / st.stepSec);
    if (last < first) return;

    for (let step = first; step <= last; step += 1) {
      const t = Math.max(now, st.origin + step * st.stepSec);
      if (st.index === 0) scheduleBell(g, st, step, t);
      else if (st.index === 1) scheduleFm(g, st, step, t);
      else if (st.index === 2) scheduleRhodes(g, st, step, t);
      else if (st.index === 3) scheduleArp(g, st, step, t);
    }
    st.nextStep = last + 1;
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

  /** About 0.55 s: cue-lever click, stylus sub-thump (at +0.18 s), band-passed groove crackle (+0.25 s). */
  function playVinylNeedleDropSfx(): void {
    const graph = sfxGraph();
    if (!graph) return;
    const t = graph.ctx.currentTime + SFX_LEAD_SEC;
    const { sfx } = graph;

    // Cue-lever click: filtered noise transient plus a small high blip, about 20 ms.
    noiseBurst(graph, { t, dur: 0.02, peak: 0.35, attack: 0.001, filterType: 'bandpass', f0: 1800, q: 1, dest: sfx });
    tone(graph, { type: 'sine', f0: 2600, t, dur: 0.02, peak: 0.1, attack: 0.001, dest: sfx });

    // Stylus touches the groove: sine 85 -> 45 Hz, 0.12 s.
    tone(graph, { type: 'sine', f0: 85, f1: 45, t: t + 0.18, dur: 0.12, peak: 0.7, attack: 0.004, dest: sfx });

    // Surface crackle: band-passed noise burst (2.8 kHz) with a few short spikes, fading over 0.3 s.
    const tc = t + 0.25;
    noiseBurst(graph, { t: tc, dur: 0.3, peak: 0.05, attack: 0.02, filterType: 'bandpass', f0: 2800, q: 1.2, dest: sfx });
    for (const offset of [0.03, 0.11, 0.19]) {
      noiseBurst(graph, { t: tc + offset, dur: 0.01, peak: 0.2, attack: 0.001, filterType: 'bandpass', f0: 3200, q: 1.5, dest: sfx });
    }
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    unlocked = false;
    const graph = g;
    g = null;
    active = null;
    if (!graph) return;
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
    for (const st of Array.from(states)) cleanupTrack(st);
    for (const n of persistent) safeDisconnect(n);
    persistent.length = 0;
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
    setTrack,
    getTrack: () => selected,
    isPlaying: () => unlocked && selected < SILENT_TRACK,
    tick,
    playVhsInsertSfx,
    playArcadeCoinSfx,
    playLampSwitchSfx,
    playPageRustleSfx,
    playVinylNeedleDropSfx,
    dispose,
  };
}
