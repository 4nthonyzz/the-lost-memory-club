// Input mode state machine (prop absent and supplied inputEnabled).
// Pure reducer: effects are returned as data and performed by the controller.
// No timers, no React/three/DOM imports.
import type { KeyRole } from './inputState';

export type InputMode = 'capturePending' | 'active' | 'inspecting';

export interface ModeState {
  mode: InputMode;
  pointerLocked: boolean;
  /** True after a lock denial or an unsupported pointer lock API. */
  keyboardLookHint: boolean;
  /** undefined = prop absent; otherwise the supplied value. */
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
  | { type: 'EXTERNAL_ENABLED'; value: boolean }
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

/** Mount state: capturePending (inspecting when the supplied prop is false), no effects. */
export function initialModeState(inputEnabled?: boolean): ModeState {
  return {
    mode: inputEnabled === false ? 'inspecting' : 'capturePending',
    pointerLocked: false,
    keyboardLookHint: false,
    inputEnabled,
    eRepeatGuard: false,
  };
}

const none = (state: ModeState): ModeResult => ({ state, effects: [] });

export function reduceMode(s: ModeState, e: ModeEvent): ModeResult {
  switch (e.type) {
    case 'CANVAS_CLICK':
      if (s.mode === 'inspecting' && s.inputEnabled === false) return none(s);
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
      return none({ ...s, mode: 'active', pointerLocked: true, keyboardLookHint: false });

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

    case 'EXTERNAL_ENABLED':
      return externalEnabled(s, e.value);

    case 'WINDOW_BLUR_OR_HIDDEN':
      return { state: s, effects: [{ type: 'CLEAR_INPUT' }] };

    case 'KEY_DOWN':
      return keyDown(s, e);
  }
}

function externalEnabled(s: ModeState, value: boolean): ModeResult {
  if (s.inputEnabled === value) return none(s);
  const first = s.inputEnabled === undefined;
  if (!value) {
    return {
      state: { ...s, inputEnabled: false, mode: 'inspecting', pointerLocked: false },
      effects: [{ type: 'RELEASE_POINTER_LOCK' }, { type: 'CLEAR_INPUT' }],
    };
  }
  // value true: first supplied value changes nothing else; false -> true needs a later gesture.
  if (first) return none({ ...s, inputEnabled: true });
  return none({ ...s, inputEnabled: true, mode: 'capturePending', pointerLocked: false });
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
    if (s.inputEnabled === false) return none(s);
    if (isEnter || isE) return resume(s, isE);
    return none(s);
  }

  if (isE) {
    if (s.eRepeatGuard) return none(s);
    if (e.hasTarget) {
      // Supplied prop: never suspend; the prop alone decides suspension.
      const mode = s.inputEnabled === undefined ? 'inspecting' : 'capturePending';
      return {
        state: { ...s, mode, pointerLocked: false, eRepeatGuard: true },
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
