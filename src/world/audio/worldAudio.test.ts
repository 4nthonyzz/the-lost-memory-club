import { describe, expect, it } from 'vitest'
import {
  AMBIENT_BPM,
  BELL_PATTERN_MIDI,
  BEAT_SEC,
  BGM_BASE_GAIN,
  LOOKAHEAD_SEC,
  createWorldAudioEngine,
  midiToHz,
  type AudioContextLike,
} from './worldAudio'

// ---------------------------------------------------------------------------
// Fake Web Audio context that records everything the engine does.
// ---------------------------------------------------------------------------

interface ParamEvent {
  kind: 'set' | 'lin' | 'exp' | 'cancel'
  value: number
  time: number
}

class FakeParam {
  value = 0
  events: ParamEvent[] = []
  setValueAtTime(value: number, time: number) {
    this.value = value
    this.events.push({ kind: 'set', value, time })
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.value = value
    this.events.push({ kind: 'lin', value, time })
  }
  exponentialRampToValueAtTime(value: number, time: number) {
    this.value = value
    this.events.push({ kind: 'exp', value, time })
  }
  cancelScheduledValues(time: number) {
    this.events.push({ kind: 'cancel', value: 0, time })
  }
  /** Every frequency value the param was set or ramped to. */
  values(): number[] {
    return this.events.filter((e) => e.kind !== 'cancel').map((e) => e.value)
  }
}

class FakeNode {
  connections: unknown[] = []
  disconnected = 0
  connect(dest: unknown) {
    this.connections.push(dest)
  }
  disconnect() {
    this.disconnected += 1
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam()
}

class FakeOsc extends FakeNode {
  type = 'sine'
  frequency = new FakeParam()
  detune = new FakeParam()
  startTime: number | undefined
  stopTime: number | undefined
  stopCalls = 0
  onended: (() => void) | null = null
  start(when?: number) {
    this.startTime = when ?? 0
  }
  stop(when?: number) {
    this.stopCalls += 1
    this.stopTime = when ?? -1
  }
}

class FakeSource extends FakeNode {
  buffer: unknown = null
  loop = false
  startTime: number | undefined
  stopTime: number | undefined
  stopCalls = 0
  onended: (() => void) | null = null
  start(when?: number) {
    this.startTime = when ?? 0
  }
  stop(when?: number) {
    this.stopCalls += 1
    this.stopTime = when ?? -1
  }
}

class FakeFilter extends FakeNode {
  type = 'lowpass'
  frequency = new FakeParam()
  Q = new FakeParam()
}

class FakeDelay extends FakeNode {
  delayTime = new FakeParam()
}

class FakeContext {
  currentTime = 0
  state = 'suspended'
  sampleRate = 8000
  destination = new FakeNode()
  calls = { resume: 0, suspend: 0, close: 0 }
  gains: FakeGain[] = []
  oscs: FakeOsc[] = []
  sources: FakeSource[] = []
  filters: FakeFilter[] = []
  delays: FakeDelay[] = []
  buffers: Float32Array[] = []
  resume() {
    this.calls.resume += 1
    this.state = 'running'
  }
  suspend() {
    this.calls.suspend += 1
    this.state = 'suspended'
  }
  close() {
    this.calls.close += 1
    this.state = 'closed'
  }
  createGain() {
    const n = new FakeGain()
    this.gains.push(n)
    return n
  }
  createOscillator() {
    const n = new FakeOsc()
    this.oscs.push(n)
    return n
  }
  createBiquadFilter() {
    const n = new FakeFilter()
    this.filters.push(n)
    return n
  }
  createBufferSource() {
    const n = new FakeSource()
    this.sources.push(n)
    return n
  }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length)
    this.buffers.push(data)
    return { getChannelData: () => data }
  }
  createDelay() {
    const n = new FakeDelay()
    this.delays.push(n)
    return n
  }
}

function setup() {
  const ctx = new FakeContext()
  let created = 0
  const engine = createWorldAudioEngine({
    contextFactory: () => {
      created += 1
      return ctx as unknown as AudioContextLike
    },
  })
  return { ctx, engine, created: () => created }
}

/** Gesture-unlocked engine. Continuous nodes already exist; helpers select only what is new. */
function unlocked() {
  const s = setup()
  s.engine.unlock()
  return { ...s, oscBase: s.ctx.oscs.length, srcBase: s.ctx.sources.length }
}

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol
const hasFreq = (o: FakeOsc, hz: number) => o.frequency.values().some((v) => near(v, hz, 0.01))
const find = (oscs: FakeOsc[], hz: number) => oscs.filter((o) => hasFreq(o, hz))

describe('worldAudio fallback (no context)', () => {
  const calls = (e: ReturnType<typeof createWorldAudioEngine>) => {
    e.unlock()
    e.setHidden(true)
    e.setHidden(false)
    e.setDucked(true)
    e.setDucked(false)
    e.tick(1)
    e.playVhsInsertSfx()
    e.playArcadeCoinSfx()
    e.playLampSwitchSfx()
    e.playPageRustleSfx()
    e.setMuted(true)
    e.toggleMuted()
    e.dispose()
    e.dispose()
  }

  it('is a silent no-op when the factory returns null', () => {
    const e = createWorldAudioEngine({ contextFactory: () => null })
    expect(() => calls(e)).not.toThrow()
    expect(e.isUnlocked()).toBe(false)
  })

  it('is a silent no-op when the factory throws', () => {
    const e = createWorldAudioEngine({
      contextFactory: () => {
        throw new Error('blocked')
      },
    })
    expect(() => calls(e)).not.toThrow()
    expect(e.isUnlocked()).toBe(false)
  })

  it('is a silent no-op without window.AudioContext', () => {
    const e = createWorldAudioEngine()
    expect(() => calls(e)).not.toThrow()
    expect(e.isUnlocked()).toBe(false)
  })

  it('tracks the muted flag even without a context', () => {
    const e = createWorldAudioEngine({ contextFactory: () => null })
    expect(e.isMuted()).toBe(false)
    expect(e.toggleMuted()).toBe(true)
    expect(e.isMuted()).toBe(true)
  })
})

describe('worldAudio unlock', () => {
  it('creates nothing before a gesture', () => {
    const { ctx, engine, created } = setup()
    engine.playVhsInsertSfx()
    engine.tick(0)
    expect(created()).toBe(0)
    expect(ctx.oscs).toHaveLength(0)
    expect(engine.isUnlocked()).toBe(false)
  })

  it('creates the context once, resumes it and starts pad and hiss once', () => {
    const { ctx, engine, created } = setup()
    engine.unlock()
    expect(created()).toBe(1)
    expect(ctx.calls.resume).toBe(1)
    expect(engine.isUnlocked()).toBe(true)
    const oscCount = ctx.oscs.length
    const loops = ctx.sources.filter((s) => s.loop)
    expect(oscCount).toBeGreaterThanOrEqual(10)
    expect(loops).toHaveLength(1)
    expect(loops[0].startTime).toBeDefined()
    // Pad notes run until dispose (never stopped on their own).
    expect(ctx.oscs.every((o) => o.stopTime === undefined)).toBe(true)

    engine.unlock()
    expect(created()).toBe(1)
    expect(ctx.calls.resume).toBe(1)
    expect(ctx.oscs).toHaveLength(oscCount)
    expect(ctx.sources.filter((s) => s.loop)).toHaveLength(1)
  })

  it('fills the cached noise buffer deterministically', () => {
    const a = setup()
    const b = setup()
    a.engine.unlock()
    b.engine.unlock()
    expect(a.ctx.buffers).toHaveLength(1)
    expect(Array.from(a.ctx.buffers[0].slice(0, 16))).toEqual(Array.from(b.ctx.buffers[0].slice(0, 16)))
    expect(a.ctx.buffers[0].some((v) => v !== 0)).toBe(true)
  })

  it('builds master, bgm (0.15) and sfx buses', () => {
    const { ctx } = unlocked()
    expect(ctx.gains[0].connections).toContain(ctx.destination)
    expect(ctx.gains[1].gain.value).toBeCloseTo(BGM_BASE_GAIN)
    expect(ctx.gains[1].connections).toContain(ctx.gains[0])
    expect(ctx.gains[2].connections).toContain(ctx.gains[0])
  })
})

describe('worldAudio SFX', () => {
  it('VHS insert: clunk, click, whir, noise burst; everything stops within 1.5 s', () => {
    const { ctx, engine, oscBase, srcBase } = unlocked()
    ctx.currentTime = 10
    engine.playVhsInsertSfx()
    const oscs = ctx.oscs.slice(oscBase)
    const sources = ctx.sources.slice(srcBase)

    const clunk = find(oscs, 115)[0]
    expect(clunk.frequency.events.some((e) => e.kind === 'exp' && e.value === 42)).toBe(true)
    expect(find(oscs, 1850)).toHaveLength(1)
    const whir = find(oscs, 210)
    expect(whir.length).toBeGreaterThanOrEqual(2)
    expect(whir.every((o) => o.frequency.events.some((e) => e.value === 290))).toBe(true)

    expect(sources).toHaveLength(1)
    expect(sources[0].loop).toBe(false)
    expect(near(sources[0].stopTime! - sources[0].startTime!, 0.45, 0.02)).toBe(true)

    for (const o of oscs) {
      expect(o.stopTime).toBeDefined()
      expect(o.stopTime! - 10).toBeLessThanOrEqual(1.5)
    }
    expect(sources[0].stopTime! - 10).toBeLessThanOrEqual(1.5)
    const end = Math.max(...oscs.map((o) => o.stopTime!), sources[0].stopTime!)
    expect(end - 10).toBeGreaterThan(1.0)
  })

  it('arcade coin: pings 48 ms apart and a B5 -> E6 chime of about 0.28 s', () => {
    const { ctx, engine, oscBase } = unlocked()
    engine.playArcadeCoinSfx()
    const oscs = ctx.oscs.slice(oscBase)
    const p1 = find(oscs, 2450)[0]
    const p2 = find(oscs, 3680)[0]
    expect(near(p2.startTime! - p1.startTime!, 0.048, 0.002)).toBe(true)
    const b5 = find(oscs, 987.77)[0]
    const e6 = find(oscs, 1318.51)[0]
    expect(near(Math.max(b5.stopTime!, e6.stopTime!) - Math.min(b5.startTime!, e6.startTime!), 0.28, 0.02)).toBe(true)
    expect(e6.startTime!).toBeGreaterThan(b5.startTime!)
    expect(oscs.every((o) => o.stopTime !== undefined)).toBe(true)
  })

  it('lamp click lasts about 35 ms and page rustle about 85 ms; all stopped', () => {
    const { ctx, engine, oscBase, srcBase } = unlocked()
    engine.playLampSwitchSfx()
    const lampSrc = ctx.sources.slice(srcBase)
    expect(lampSrc).toHaveLength(1)
    expect(near(lampSrc[0].stopTime! - lampSrc[0].startTime!, 0.035, 0.002)).toBe(true)
    const lampOscs = ctx.oscs.slice(oscBase)
    expect(find(lampOscs, 3000)).toHaveLength(1)
    expect(lampOscs.every((o) => o.stopTime !== undefined)).toBe(true)

    const base = ctx.sources.length
    engine.playPageRustleSfx()
    const rustle = ctx.sources.slice(base)
    expect(rustle).toHaveLength(1)
    expect(near(rustle[0].stopTime! - rustle[0].startTime!, 0.085, 0.002)).toBe(true)
    expect(rustle[0].stopTime).toBeDefined()
  })

  it('does not play SFX when muted or hidden', () => {
    const { ctx, engine, srcBase } = unlocked()
    engine.setMuted(true)
    engine.playLampSwitchSfx()
    engine.setMuted(false)
    engine.setHidden(true)
    engine.playPageRustleSfx()
    expect(ctx.sources.slice(srcBase)).toHaveLength(0)
  })

  it('keeps every gain within [0, 1]', () => {
    const { ctx, engine } = unlocked()
    engine.playVhsInsertSfx()
    engine.playArcadeCoinSfx()
    engine.playLampSwitchSfx()
    engine.playPageRustleSfx()
    for (const gain of ctx.gains) {
      for (const e of gain.gain.events) {
        expect(e.value).toBeGreaterThanOrEqual(0)
        expect(e.value).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('worldAudio ambient bells', () => {
  const fundamentals = new Set(BELL_PATTERN_MIDI.filter((m) => m >= 0).map((m) => midiToHz(m)))
  const bells = (ctx: FakeContext, from: number) =>
    ctx.oscs.slice(from).filter((o) => o.type === 'sine' && fundamentals.has(o.frequency.values()[0]))

  it('uses 78 BPM and D-Dorian pitches', () => {
    expect(AMBIENT_BPM).toBe(78)
    expect(BEAT_SEC).toBeCloseTo(60 / 78, 10)
    const dorian = new Set([2, 4, 5, 7, 9, 11, 0])
    for (const m of BELL_PATTERN_MIDI) if (m >= 0) expect(dorian.has(m % 12)).toBe(true)
  })

  it('schedules only inside the lookahead window, on the beat grid, never twice', () => {
    const { ctx, engine, oscBase } = unlocked()
    ctx.currentTime = 0
    engine.tick(0)
    const first = bells(ctx, oscBase)
    expect(first.length).toBeGreaterThan(0)
    for (const o of first) {
      expect(o.startTime!).toBeGreaterThanOrEqual(0)
      expect(o.startTime!).toBeLessThanOrEqual(LOOKAHEAD_SEC)
      // Even beats only (one note every 2 beats).
      const beat = o.startTime! / BEAT_SEC
      expect(near(beat / 2, Math.round(beat / 2), 1e-6)).toBe(true)
    }
    const count = ctx.oscs.length
    engine.tick(0)
    engine.tick(0.1)
    expect(ctx.oscs).toHaveLength(count)

    ctx.currentTime = 2
    engine.tick(2)
    const all = bells(ctx, oscBase)
    const starts = all.map((o) => o.startTime!)
    expect(new Set(starts.map((s) => s.toFixed(6))).size).toBeLessThanOrEqual(starts.length)
    // No beat is scheduled twice: fundamentals from different beats never share a start time and pitch.
    const keys = all.map((o) => `${o.startTime!.toFixed(6)}:${o.frequency.values()[0]}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('skips past notes after a jump in currentTime instead of replaying a backlog', () => {
    const { ctx, engine, oscBase } = unlocked()
    engine.tick(0)
    const before = ctx.oscs.length
    ctx.currentTime = 100
    engine.tick(100)
    const added = ctx.oscs.slice(before).filter((o) => o.type === 'sine' && fundamentals.has(o.frequency.values()[0]))
    expect(added.length).toBeLessThanOrEqual(2)
    for (const o of added) {
      expect(o.startTime!).toBeGreaterThanOrEqual(100)
      expect(o.startTime!).toBeLessThanOrEqual(100 + LOOKAHEAD_SEC)
    }
    expect(bells(ctx, oscBase).length).toBeGreaterThan(0)
  })

  it('is a no-op when locked, muted, hidden or not running', () => {
    const locked = setup()
    locked.engine.tick(0)
    expect(locked.ctx.oscs).toHaveLength(0)

    const muted = unlocked()
    muted.engine.setMuted(true)
    muted.engine.tick(0)
    expect(muted.ctx.oscs).toHaveLength(muted.oscBase)

    const hid = unlocked()
    hid.engine.setHidden(true)
    hid.engine.tick(0)
    expect(hid.ctx.oscs).toHaveLength(hid.oscBase)

    const paused = unlocked()
    paused.ctx.state = 'suspended'
    paused.engine.tick(0)
    expect(paused.ctx.oscs).toHaveLength(paused.oscBase)
  })

  it('schedules the notes that were skipped while muted only from the current time', () => {
    const { ctx, engine, oscBase } = unlocked()
    engine.setMuted(true)
    ctx.currentTime = 50
    engine.tick(50)
    engine.setMuted(false)
    engine.tick(50)
    const bellsNow = bells(ctx, oscBase)
    expect(bellsNow.every((o) => o.startTime! >= 50)).toBe(true)
  })
})

describe('worldAudio mixer controls', () => {
  it('ducks the BGM bus to 0.4x and back', () => {
    const { ctx, engine } = unlocked()
    ctx.currentTime = 5
    engine.setDucked(true)
    const bgm = ctx.gains[1].gain
    const down = bgm.events.filter((e) => e.kind === 'lin').pop()!
    expect(down.value).toBeCloseTo(BGM_BASE_GAIN * 0.4)
    expect(near(down.time, 5.35, 0.01)).toBe(true)
    ctx.currentTime = 8
    engine.setDucked(false)
    const up = bgm.events.filter((e) => e.kind === 'lin').pop()!
    expect(up.value).toBeCloseTo(BGM_BASE_GAIN)
  })

  it('applies a duck requested before unlock', () => {
    const { ctx, engine } = setup()
    engine.setDucked(true)
    engine.unlock()
    expect(ctx.gains[1].gain.value).toBeCloseTo(BGM_BASE_GAIN * 0.4)
  })

  it('ramps the master gain to 0 and back; toggleMuted returns the new state', () => {
    const { ctx, engine } = unlocked()
    const master = ctx.gains[0].gain
    engine.setMuted(true)
    expect(engine.isMuted()).toBe(true)
    expect(master.events.filter((e) => e.kind === 'lin').pop()!.value).toBe(0)
    expect(engine.toggleMuted()).toBe(false)
    expect(engine.isMuted()).toBe(false)
    expect(master.events.filter((e) => e.kind === 'lin').pop()!.value).toBe(1)
    expect(engine.toggleMuted()).toBe(true)
  })
})

describe('worldAudio visibility', () => {
  it('suspends when hidden and resumes when shown', () => {
    const { ctx, engine } = unlocked()
    engine.setHidden(true)
    expect(ctx.calls.suspend).toBe(1)
    engine.setHidden(false)
    expect(ctx.calls.resume).toBe(2)
    expect(ctx.state).toBe('running')
  })

  it('does not resume when muted or when locked', () => {
    const locked = setup()
    locked.engine.setHidden(true)
    locked.engine.setHidden(false)
    expect(locked.ctx.calls.suspend + locked.ctx.calls.resume).toBe(0)

    const { ctx, engine } = unlocked()
    engine.setHidden(true)
    engine.setMuted(true)
    engine.setHidden(false)
    expect(ctx.calls.resume).toBe(1)
    engine.setMuted(false)
    expect(ctx.calls.resume).toBe(2)
  })
})

describe('worldAudio dispose', () => {
  it('stops continuous nodes, disconnects, closes once and then no-ops', () => {
    const { ctx, engine, oscBase } = unlocked()
    engine.playLampSwitchSfx()
    engine.dispose()
    engine.dispose()
    expect(ctx.calls.close).toBe(1)
    expect(ctx.oscs.slice(0, oscBase).every((o) => o.stopCalls >= 1 && o.disconnected >= 1)).toBe(true)
    expect(ctx.sources.every((s) => s.stopCalls >= 1 && s.disconnected >= 1)).toBe(true)
    expect(ctx.gains.every((g) => g.disconnected >= 1)).toBe(true)
    expect(engine.isUnlocked()).toBe(false)

    const oscs = ctx.oscs.length
    const sources = ctx.sources.length
    expect(() => {
      engine.unlock()
      engine.tick(0)
      engine.setHidden(true)
      engine.setHidden(false)
      engine.setDucked(true)
      engine.setMuted(false)
      engine.playVhsInsertSfx()
      engine.playArcadeCoinSfx()
      engine.playLampSwitchSfx()
      engine.playPageRustleSfx()
    }).not.toThrow()
    expect(ctx.oscs).toHaveLength(oscs)
    expect(ctx.sources).toHaveLength(sources)
    expect(ctx.calls.resume).toBe(1)
    expect(ctx.calls.suspend).toBe(0)
  })

  it('disconnects a finished voice on ended', () => {
    const { ctx, engine, oscBase } = unlocked()
    engine.playArcadeCoinSfx()
    const osc = ctx.oscs[oscBase]
    expect(osc.onended).toBeTypeOf('function')
    osc.onended!()
    expect(osc.disconnected).toBe(1)
  })
})

describe('worldAudio determinism', () => {
  const raw = import.meta.glob('./worldAudio.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

  it('uses no random, clock or timer APIs and no React or three imports', () => {
    const source = Object.values(raw)[0] ?? ''
    expect(source.length).toBeGreaterThan(0)
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
    expect(code).not.toMatch(/Math\s*\.\s*random/)
    expect(code).not.toMatch(/\bDate\b/)
    expect(code).not.toMatch(/performance\s*\.\s*now/)
    expect(code).not.toMatch(/\b(setInterval|setTimeout|requestAnimationFrame)\b/)
    expect(code).not.toMatch(/from\s*['"](react|three|@react-three)/)
    expect(code).not.toMatch(/localStorage|sessionStorage|indexedDB/)
  })
})
