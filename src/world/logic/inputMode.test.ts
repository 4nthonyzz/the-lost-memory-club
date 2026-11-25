import { describe, expect, it } from 'vitest';
import {
  initialModeState,
  reduceMode,
  type ModeEffect,
  type ModeEvent,
  type ModeState,
} from './inputMode';

const keyE = (o: Partial<Extract<ModeEvent, { type: 'KEY_DOWN' }>> = {}): ModeEvent => ({
  type: 'KEY_DOWN',
  role: 'interact',
  code: 'KeyE',
  repeat: false,
  accepted: true,
  hasTarget: true,
  ...o,
});
const enter = (o: Partial<Extract<ModeEvent, { type: 'KEY_DOWN' }>> = {}): ModeEvent => ({
  type: 'KEY_DOWN',
  role: null,
  code: 'Enter',
  repeat: false,
  accepted: true,
  hasTarget: false,
  ...o,
});
const keyUpE: ModeEvent = { type: 'KEY_UP', role: 'interact' };

function run(s: ModeState, events: ModeEvent[]) {
  const all: ModeEffect[] = [];
  let state = s;
  for (const ev of events) {
    const r = reduceMode(state, ev);
    state = r.state;
    all.push(...r.effects);
  }
  return { state, effects: all };
}
const types = (fx: ModeEffect[]) => fx.map((f) => f.type);
const active = () => reduceMode(initialModeState(), { type: 'LOCK_ACQUIRED' }).state;
const inspecting = () => reduceMode(initialModeState(), keyE()).state;

describe('initialModeState', () => {
  it('starts in capturePending with the prop absent', () => {
    expect(initialModeState()).toEqual({
      mode: 'capturePending',
      pointerLocked: false,
      keyboardLookHint: false,
      inputEnabled: undefined,
      eRepeatGuard: false,
    });
  });
});

describe('lock transitions', () => {
  it('LOCK_ACQUIRED moves capturePending to active', () => {
    const r = reduceMode(initialModeState(), { type: 'LOCK_ACQUIRED' });
    expect(r.state.mode).toBe('active');
    expect(r.state.pointerLocked).toBe(true);
    expect(r.effects).toEqual([]);
  });

  it('LOCK_LOST (Esc) returns active to capturePending without onInspect', () => {
    const r = reduceMode(active(), { type: 'LOCK_LOST' });
    expect(r.state.mode).toBe('capturePending');
    expect(r.state.pointerLocked).toBe(false);
    expect(types(r.effects)).not.toContain('CALL_ON_INSPECT');
    expect(r.effects).toEqual([]);
  });

  it('lock events are ignored while inspecting', () => {
    const s = inspecting();
    for (const type of ['LOCK_ACQUIRED', 'LOCK_LOST', 'LOCK_DENIED', 'LOCK_UNSUPPORTED'] as const) {
      const r = reduceMode(s, { type });
      expect(r.state).toBe(s);
      expect(r.effects).toEqual([]);
    }
  });
});

describe('pointer lock requests (user gesture only)', () => {
  it('CANVAS_CLICK in capturePending focuses and requests lock', () => {
    const r = reduceMode(initialModeState(), { type: 'CANVAS_CLICK' });
    expect(types(r.effects)).toEqual(['FOCUS_CANVAS', 'REQUEST_POINTER_LOCK']);
    expect(r.state.mode).toBe('capturePending');
  });

  it('Enter in capturePending is a key activation that requests lock', () => {
    const r = reduceMode(initialModeState(), enter());
    expect(types(r.effects)).toEqual(['FOCUS_CANVAS', 'REQUEST_POINTER_LOCK']);
  });

  it('repeat or unaccepted Enter does not request lock', () => {
    expect(reduceMode(initialModeState(), enter({ repeat: true })).effects).toEqual([]);
    expect(reduceMode(initialModeState(), enter({ accepted: false })).effects).toEqual([]);
  });

  it('no lock request from lock events, blur, or movement keys', () => {
    const events: ModeEvent[] = [
      { type: 'LOCK_ACQUIRED' },
      { type: 'LOCK_LOST' },
      { type: 'LOCK_DENIED' },
      { type: 'LOCK_UNSUPPORTED' },
      { type: 'WINDOW_BLUR_OR_HIDDEN' },
      { type: 'KEY_UP', role: 'forward' },
      { type: 'KEY_DOWN', role: 'forward', code: 'KeyW', repeat: false, accepted: true, hasTarget: true },
    ];
    const { effects } = run(initialModeState(), events);
    expect(types(effects)).not.toContain('REQUEST_POINTER_LOCK');
  });

  it('CANVAS_CLICK while active is a no-op', () => {
    const s = active();
    const r = reduceMode(s, { type: 'CANVAS_CLICK' });
    expect(r.state).toBe(s);
    expect(r.effects).toEqual([]);
  });
});

describe('denial without retry', () => {
  it.each(['LOCK_DENIED', 'LOCK_UNSUPPORTED'] as const)(
    '%s sets keyboardLookHint and emits no effects',
    (type) => {
      const r = reduceMode(initialModeState(), { type });
      expect(r.state.keyboardLookHint).toBe(true);
      expect(r.state.mode).toBe('capturePending');
      expect(r.effects).toEqual([]);
    },
  );

  it('a later CANVAS_CLICK is a new gesture and requests lock again', () => {
    const denied = reduceMode(initialModeState(), { type: 'LOCK_DENIED' }).state;
    const r = reduceMode(denied, { type: 'CANVAS_CLICK' });
    expect(types(r.effects)).toContain('REQUEST_POINTER_LOCK');
    expect(r.state.keyboardLookHint).toBe(true);
  });
});

describe('interaction (E)', () => {
  it('E with target in capturePending enters inspecting', () => {
    const r = reduceMode(initialModeState(), keyE());
    expect(r.state.mode).toBe('inspecting');
    expect(r.state.eRepeatGuard).toBe(true);
    expect(types(r.effects)).toEqual(['CALL_ON_INSPECT', 'RELEASE_POINTER_LOCK', 'CLEAR_INPUT']);
  });

  it('E with target while active enters inspecting and clears the lock flag', () => {
    const r = reduceMode(active(), keyE());
    expect(r.state.mode).toBe('inspecting');
    expect(r.state.pointerLocked).toBe(false);
    expect(types(r.effects)).toEqual(['CALL_ON_INSPECT', 'RELEASE_POINTER_LOCK', 'CLEAR_INPUT']);
  });

  it('E without a target emits no CALL_ON_INSPECT and stays in mode', () => {
    const r = reduceMode(active(), keyE({ hasTarget: false }));
    expect(r.state.mode).toBe('active');
    expect(r.effects).toEqual([]);
  });

  it('unaccepted E (e.g. typing in a field) does nothing', () => {
    const s = initialModeState();
    const r = reduceMode(s, keyE({ accepted: false }));
    expect(r.state).toBe(s);
    expect(r.effects).toEqual([]);
  });

  it('repeat E never calls onInspect', () => {
    const r = reduceMode(initialModeState(), keyE({ repeat: true }));
    expect(r.state.mode).toBe('capturePending');
    expect(types(r.effects)).not.toContain('CALL_ON_INSPECT');
  });

  it('held E is guarded: only one CALL_ON_INSPECT per press', () => {
    const { effects } = run(initialModeState(), [keyE(), keyE({ repeat: true }), keyE({ repeat: true })]);
    expect(types(effects).filter((t) => t === 'CALL_ON_INSPECT')).toHaveLength(1);
  });

  it('eRepeatGuard blocks a second press until KEY_UP of E', () => {
    const s = { ...initialModeState(), eRepeatGuard: true };
    expect(types(reduceMode(s, keyE()).effects)).not.toContain('CALL_ON_INSPECT');
    const released = reduceMode(s, keyUpE).state;
    expect(released.eRepeatGuard).toBe(false);
    expect(types(reduceMode(released, keyE()).effects)).toContain('CALL_ON_INSPECT');
  });

  it('KEY_UP of E clears the guard even while inspecting', () => {
    const r = reduceMode(inspecting(), keyUpE);
    expect(r.state.mode).toBe('inspecting');
    expect(r.state.eRepeatGuard).toBe(false);
  });

  it('Esc never emits CALL_ON_INSPECT', () => {
    const esc: ModeEvent = {
      type: 'KEY_DOWN', role: null, code: 'Escape', repeat: false, accepted: true, hasTarget: true,
    };
    for (const s of [initialModeState(), active(), inspecting()]) {
      const r = run(s, [esc, { type: 'LOCK_LOST' }]);
      expect(types(r.effects)).not.toContain('CALL_ON_INSPECT');
    }
  });
});

describe('inspecting', () => {
  it('ignores movement, look and unrelated keys', () => {
    const s = inspecting();
    for (const code of ['KeyW', 'ArrowLeft', 'KeyJ', 'Space']) {
      const r = reduceMode(s, {
        type: 'KEY_DOWN', role: null, code, repeat: false, accepted: true, hasTarget: true,
      });
      expect(r.state).toBe(s);
      expect(r.effects).toEqual([]);
    }
  });

  it('does not emit a second CALL_ON_INSPECT for E with a target', () => {
    const s = reduceMode(inspecting(), keyUpE).state;
    // E here is a Resume_Action, not an interaction.
    const r = reduceMode(s, keyE());
    expect(types(r.effects)).not.toContain('CALL_ON_INSPECT');
  });

  it('stays inspecting with no timers: unrelated events never leave it', () => {
    const { state } = run(inspecting(), [
      { type: 'LOCK_ACQUIRED' },
      { type: 'LOCK_LOST' },
      { type: 'WINDOW_BLUR_OR_HIDDEN' },
      keyUpE,
    ]);
    expect(state.mode).toBe('inspecting');
  });
});

describe('Resume_Action', () => {
  it('click resumes to capturePending with CLEAR_INPUT and FOCUS_CANVAS, no lock request', () => {
    const r = reduceMode(inspecting(), { type: 'CANVAS_CLICK' });
    expect(r.state.mode).toBe('capturePending');
    expect(r.state.eRepeatGuard).toBe(false);
    expect(types(r.effects)).toEqual(['CLEAR_INPUT', 'FOCUS_CANVAS']);
  });

  it('Enter resumes without an interaction or lock request', () => {
    const r = reduceMode(inspecting(), enter());
    expect(r.state.mode).toBe('capturePending');
    expect(types(r.effects)).toEqual(['CLEAR_INPUT', 'FOCUS_CANVAS']);
  });

  it('E resumes and that press is not an interaction', () => {
    const s = reduceMode(inspecting(), keyUpE).state;
    const r = reduceMode(s, keyE());
    expect(r.state.mode).toBe('capturePending');
    expect(r.state.eRepeatGuard).toBe(true);
    expect(types(r.effects)).toEqual(['CLEAR_INPUT', 'FOCUS_CANVAS']);
    // Held E after resume stays inert, then the next press interacts.
    expect(types(reduceMode(r.state, keyE({ repeat: true })).effects)).toEqual([]);
    expect(types(reduceMode(r.state, keyE()).effects)).not.toContain('CALL_ON_INSPECT');
    const next = reduceMode(reduceMode(r.state, keyUpE).state, keyE());
    expect(types(next.effects)).toContain('CALL_ON_INSPECT');
  });

  it('repeat or unaccepted resume keys are ignored', () => {
    const s = inspecting();
    expect(reduceMode(s, enter({ repeat: true })).state).toBe(s);
    expect(reduceMode(s, enter({ accepted: false })).state).toBe(s);
  });
});

describe('blur / hidden', () => {
  it('clears input in every mode without changing mode', () => {
    for (const s of [initialModeState(), active(), inspecting()]) {
      const r = reduceMode(s, { type: 'WINDOW_BLUR_OR_HIDDEN' });
      expect(r.state).toBe(s);
      expect(r.effects).toEqual([{ type: 'CLEAR_INPUT' }]);
    }
  });
});
