import { describe, expect, it } from 'vitest';
import { initialModeState, reduceMode, type ModeEvent, type ModeState } from './inputMode';

const keyE = (hasTarget = true): ModeEvent => ({
  type: 'KEY_DOWN', role: 'interact', code: 'KeyE', repeat: false, accepted: true, hasTarget,
});
const enter: ModeEvent = {
  type: 'KEY_DOWN', role: null, code: 'Enter', repeat: false, accepted: true, hasTarget: false,
};
const click: ModeEvent = { type: 'CANVAS_CLICK' };
const ext = (value: boolean): ModeEvent => ({ type: 'EXTERNAL_ENABLED', value });
const types = (effects: { type: string }[]) => effects.map((x) => x.type);

function run(s: ModeState, ...events: ModeEvent[]) {
  let state = s;
  const all: { type: string }[][] = [];
  for (const ev of events) {
    const r = reduceMode(state, ev);
    state = r.state;
    all.push(r.effects);
  }
  return { state, all };
}

const active = (v?: boolean): ModeState => ({
  ...initialModeState(v), mode: 'active', pointerLocked: true,
});

describe('initialModeState with supplied prop', () => {
  it('absent stays undefined, true and false set the value', () => {
    expect(initialModeState().inputEnabled).toBeUndefined();
    expect(initialModeState(true)).toMatchObject({ mode: 'capturePending', inputEnabled: true });
    expect(initialModeState(false)).toMatchObject({ mode: 'inspecting', inputEnabled: false });
  });
});

describe('EXTERNAL_ENABLED transitions', () => {
  it('true -> false enters inspecting, releases lock, clears input, no CALL_ON_INSPECT', () => {
    const r = reduceMode(active(true), ext(false));
    expect(r.state).toMatchObject({ mode: 'inspecting', pointerLocked: false, inputEnabled: false });
    expect(types(r.effects)).toEqual(['RELEASE_POINTER_LOCK', 'CLEAR_INPUT']);
  });

  it('false -> true enters capturePending with no effects (no REQUEST_POINTER_LOCK)', () => {
    const r = reduceMode(initialModeState(false), ext(true));
    expect(r.state).toMatchObject({ mode: 'capturePending', inputEnabled: true, pointerLocked: false });
    expect(r.effects).toEqual([]);
  });

  it('unchanged value is a no-op', () => {
    const s = active(true);
    expect(reduceMode(s, ext(true))).toEqual({ state: s, effects: [] });
    const f = initialModeState(false);
    expect(reduceMode(f, ext(false))).toEqual({ state: f, effects: [] });
  });

  it('first supplied value from absent: false suspends, true changes only the prop', () => {
    const a = active();
    const f = reduceMode(a, ext(false));
    expect(f.state).toMatchObject({ mode: 'inspecting', inputEnabled: false });
    expect(types(f.effects)).toEqual(['RELEASE_POINTER_LOCK', 'CLEAR_INPUT']);
    const t = reduceMode(a, ext(true));
    expect(t.state).toEqual({ ...a, inputEnabled: true });
    expect(t.effects).toEqual([]);
  });

  it('never emits REQUEST_POINTER_LOCK on any prop change sequence', () => {
    const { all } = run(initialModeState(true), ext(false), ext(true), ext(false), ext(true));
    expect(all.flat().map((x) => x.type)).not.toContain('REQUEST_POINTER_LOCK');
  });
});

describe('input ignored while the supplied prop is false', () => {
  it('click, Enter and E do nothing and never resume', () => {
    const s = initialModeState(false);
    for (const ev of [click, enter, keyE(true), keyE(false)]) {
      expect(reduceMode(s, ev)).toEqual({ state: s, effects: [] });
    }
  });

  it('LOCK events are ignored', () => {
    const s = initialModeState(false);
    for (const t of ['LOCK_ACQUIRED', 'LOCK_LOST', 'LOCK_DENIED', 'LOCK_UNSUPPORTED'] as const) {
      expect(reduceMode(s, { type: t }).state.mode).toBe('inspecting');
    }
  });
});

describe('onInspect with supplied prop', () => {
  it('from active: emits effects and moves to capturePending, never inspecting', () => {
    const r = reduceMode(active(true), keyE());
    expect(types(r.effects)).toEqual(['CALL_ON_INSPECT', 'RELEASE_POINTER_LOCK', 'CLEAR_INPUT']);
    expect(r.state).toMatchObject({ mode: 'capturePending', pointerLocked: false });
  });

  it('absent vs supplied diverge only in the resulting mode', () => {
    const a = reduceMode(active(), keyE());
    const b = reduceMode(active(true), keyE());
    expect(a.effects).toEqual(b.effects);
    expect(a.state.mode).toBe('inspecting');
    expect(b.state.mode).toBe('capturePending');
  });

  it('locked-arcade case: stays capturePending, next click requests lock', () => {
    const s0 = initialModeState(true);
    const r = reduceMode(s0, keyE());
    expect(types(r.effects)).toContain('CALL_ON_INSPECT');
    expect(r.state.mode).toBe('capturePending');
    const c = reduceMode(r.state, click);
    expect(types(c.effects)).toEqual(['FOCUS_CANVAS', 'REQUEST_POINTER_LOCK']);
  });

  it('then the prop going false suspends, and true returns to capturePending', () => {
    const r1 = reduceMode(initialModeState(true), keyE());
    const r2 = reduceMode(r1.state, ext(false));
    expect(r2.state.mode).toBe('inspecting');
    const r3 = reduceMode(r2.state, ext(true));
    expect(r3.state.mode).toBe('capturePending');
    expect(r3.effects).toEqual([]);
  });

  it('LOCK_ACQUIRED clears keyboardLookHint', () => {
    const s = { ...initialModeState(true), keyboardLookHint: true };
    expect(reduceMode(s, { type: 'LOCK_ACQUIRED' }).state.keyboardLookHint).toBe(false);
  });
});

describe('blur or visibility clears input in all modes', () => {
  it.each([
    ['capturePending', initialModeState(true)],
    ['active', active(true)],
    ['inspecting (supplied false)', initialModeState(false)],
    ['absent', initialModeState()],
  ])('%s', (_n, s) => {
    const r = reduceMode(s, { type: 'WINDOW_BLUR_OR_HIDDEN' });
    expect(types(r.effects)).toEqual(['CLEAR_INPUT']);
    expect(r.state).toEqual(s);
  });
});
