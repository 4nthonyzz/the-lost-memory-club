// Input mode state machine (prop-absent behavior only, M1).
// Pure reducer: effects are returned as data and performed by the controller.
// No timers, no React/three/DOM imports. The supplied `inputEnabled` prop rules
// and the EXTERNAL_ENABLED event are added in task 9.4.
import type { KeyRole } from './inputState';

export type InputMode = 'capturePending' | 'active' | 'inspecting';

export interface ModeState {
  mode: InputMode;
  pointerLocked: boolean;
  /** True after a lock denial or an unsupported pointer lock API. */
  keyboardLookHint: boolean;
  /** undefined = prop absent. Always undefined in M1. */
  inputEnabled: boolean | undefined;
  /** True while E is physically held after a press that was consumed. */
  eRepeatGuard: boolean;
}

export type ModeEvent =
  | { type: 'CANVAS_CLICK' }
  | { type: 'LOCK_ACQUIRED' }
  | { type: 'LOCK_LOST' }
  | { type: 'LOCK_DENIED' }
  | { type: 'LOCK_UNSUPPORTED' }
  | {
      type: 'KEY_DOWN';
      role: KeyRole | null;
      code: string;
      repeat: boolean;
      accepted: boolean;
      hasTarget: boolean;
    }
  | { type: 'KEY_UP'; role: KeyRole | null }
  | { type: 'WINDOW_BLUR_OR_HIDDEN' };

export type ModeEffect =
  | { type: 'CALL_ON_INSPECT' }
  | { type: 'RELEASE_POINTER_LOCK' }
  | { type: 'REQUEST_POINTER_LOCK' }
  | { type: 'CLEAR_INPUT' }
  | { type: 'FOCUS_CANVAS' };

export interface ModeResult {
  state: ModeState;
  effects: ModeEffect[];
}

/** Mount state: capturePending, no effects. */
export function initialModeState(): ModeState {
  return {
    mode: 'capturePending',
    pointerLocked: false,
    keyboardLookHint: false,
    inputEnabled: undefined,
    eRepeatGuard: false,
  };
}

const none = (state: ModeState): ModeResult => ({ state, effects: [] });

export function reduceMode(s: ModeState, e: ModeEvent): ModeResult {
  switch (e.type) {
    case 'CANVAS_CLICK':
      if (s.mode === 'inspecting') return resume(s, false);
      if (s.mode === 'capturePending') {
        return {
          state: s,
          effects: [{ type: 'FOCUS_CANVAS' }, { type: 'REQUEST_POINTER_LOCK' }],
        };
      }
      return none(s);

    case 'LOCK_ACQUIRED':
      if (s.mode !== 'capturePending') return none(s);
      return none({ ...s, mode: 'active', pointerLocked: true });

    case 'LOCK_LOST':
      if (s.mode === 'inspecting') return none(s);
      return none({ ...s, mode: 'capturePending', pointerLocked: false });

    case 'LOCK_DENIED':
    case 'LOCK_UNSUPPORTED':
      if (s.mode === 'inspecting') return none(s);
      return none({ ...s, keyboardLookHint: true });

    case 'KEY_UP':
      if (e.role === 'interact' && s.eRepeatGuard) {
        return none({ ...s, eRepeatGuard: false });
      }
      return none(s);

    case 'WINDOW_BLUR_OR_HIDDEN':
      return { state: s, effects: [{ type: 'CLEAR_INPUT' }] };

    case 'KEY_DOWN':
      return keyDown(s, e);
  }
}

function resume(s: ModeState, byE: boolean): ModeResult {
  return {
    state: { ...s, mode: 'capturePending', pointerLocked: false, eRepeatGuard: byE },
    effects: [{ type: 'CLEAR_INPUT' }, { type: 'FOCUS_CANVAS' }],
  };
}

function keyDown(s: ModeState, e: Extract<ModeEvent, { type: 'KEY_DOWN' }>): ModeResult {
  if (!e.accepted || e.repeat) return none(s);

  const isEnter = e.code === 'Enter';
  const isE = e.code === 'KeyE' || e.role === 'interact';

  if (s.mode === 'inspecting') {
    if (isEnter || isE) return resume(s, isE);
    return none(s);
  }

  if (isE) {
    if (s.eRepeatGuard) return none(s);
    if (e.hasTarget) {
      return {
        state: { ...s, mode: 'inspecting', pointerLocked: false, eRepeatGuard: true },
        effects: [
          { type: 'CALL_ON_INSPECT' },
          { type: 'RELEASE_POINTER_LOCK' },
          { type: 'CLEAR_INPUT' },
        ],
      };
    }
  }

  // Key activation of the capture overlay (valid user gesture).
  if ((isEnter || isE) && s.mode === 'capturePending') {
    return {
      state: s,
      effects: [{ type: 'FOCUS_CANVAS' }, { type: 'REQUEST_POINTER_LOCK' }],
    };
  }

  return none(s);
}
