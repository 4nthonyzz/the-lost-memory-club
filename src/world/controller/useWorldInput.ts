// DOM input controller. Binds DOM events to the pure input modules and
// performs the effects they return. No arcade/memories imports, no storage.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { StationId } from '../../core/contracts';
import {
  initialModeState,
  reduceMode,
  type InputMode,
  type ModeEvent,
  type ModeState,
} from '../logic/inputMode';
import {
  EMPTY_HELD_KEYS,
  isKeyEventAccepted,
  keyRole,
  reduceHeldKeys,
  type HeldKeys,
} from '../logic/inputState';
import {
  attachPointerLockListeners,
  exitLock,
  isLocked,
  requestLock,
  usePointerLock,
  type MouseDelta,
} from './usePointerLock';

export interface UseWorldInputOptions {
  /** The World_Wrapper element. Key listeners attach here, never to window. */
  wrapperRef: RefObject<HTMLElement | null>;
  /** Element that receives pointer lock and focus. Defaults to the wrapper. */
  lockElementRef?: RefObject<HTMLElement | null>;
  /** Latest onInspect callback. Read through a ref, never re-registers listeners. */
  onInspect: (id: StationId) => void;
  /** Returns the current interaction target, or null. Read at key time. */
  getTarget: () => StationId | null;
}

export interface WorldInput {
  /** Mode for rendering. React state, updated only when the mode changes. */
  mode: InputMode;
  /** True after a lock denial or unsupported pointer lock API. Updated only on change. */
  keyboardLookHint: boolean;
  /** Reads the current mode without a render. */
  getMode: () => InputMode;
  heldKeysRef: { current: HeldKeys };
  mouseDeltaRef: { current: MouseDelta };
  consumeMouseDelta: () => MouseDelta;
}

export function useWorldInput(options: UseWorldInputOptions): WorldInput {
  const { wrapperRef, lockElementRef } = options;
  const { mouseDeltaRef, consumeMouseDelta, clearMouseDelta } = usePointerLock();

  const stateRef = useRef<ModeState>(initialModeState());
  const heldKeysRef = useRef<HeldKeys>(EMPTY_HELD_KEYS);
  const [mode, setMode] = useState<InputMode>(stateRef.current.mode);
  const [keyboardLookHint, setKeyboardLookHint] = useState<boolean>(false);

  // Latest callbacks, read at event time.
  const onInspectRef = useRef(options.onInspect);
  const getTargetRef = useRef(options.getTarget);
  onInspectRef.current = options.onInspect;
  getTargetRef.current = options.getTarget;

  const getMode = useCallback((): InputMode => stateRef.current.mode, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;
    const doc = wrapper.ownerDocument;
    const win = doc.defaultView;

    const getLockElement = (): HTMLElement => lockElementRef?.current ?? wrapper;

    const clearInput = () => {
      heldKeysRef.current = reduceHeldKeys(heldKeysRef.current, { type: 'clear' });
      clearMouseDelta();
    };

    /**
     * Runs one event through reduceMode and performs its effects.
     * `gesture` is true only when called synchronously from a click or keydown
     * handler. REQUEST_POINTER_LOCK is ignored otherwise.
     */
    const dispatch = (event: ModeEvent, gesture: boolean) => {
      const prev = stateRef.current;
      const result = reduceMode(prev, event);
      stateRef.current = result.state;
      for (const effect of result.effects) {
        switch (effect.type) {
          case 'CALL_ON_INSPECT': {
            const target = getTargetRef.current();
            if (target !== null) onInspectRef.current(target);
            break;
          }
          case 'RELEASE_POINTER_LOCK':
            exitLock(doc);
            break;
          case 'CLEAR_INPUT':
            clearInput();
            break;
          case 'FOCUS_CANVAS':
            getLockElement().focus({ preventScroll: true });
            break;
          case 'REQUEST_POINTER_LOCK':
            if (gesture) {
              requestLock(getLockElement(), {
                onDenied: () => dispatch({ type: 'LOCK_DENIED' }, false),
                onUnsupported: () => dispatch({ type: 'LOCK_UNSUPPORTED' }, false),
              });
            }
            break;
        }
      }
      if (result.state.mode !== prev.mode) setMode(result.state.mode);
      if (result.state.keyboardLookHint !== prev.keyboardLookHint) {
        setKeyboardLookHint(result.state.keyboardLookHint);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as Element | null;
      const role = keyRole(e.code);
      const accepted = isKeyEventAccepted({
        tagName: target?.tagName ?? '',
        isContentEditable: (target as HTMLElement | null)?.isContentEditable === true,
        insideWorldWrapper: target instanceof Node && wrapper.contains(target),
      });
      const modeBefore = stateRef.current.mode;

      if (accepted && role !== null && role !== 'interact' && modeBefore !== 'inspecting') {
        heldKeysRef.current = reduceHeldKeys(heldKeysRef.current, { type: 'down', role });
      }
      // preventDefault only for used keys while not inspecting. Esc is never touched.
      if (accepted && role !== null && modeBefore !== 'inspecting' && e.code !== 'Escape') {
        e.preventDefault();
      }

      const hasTarget = role === 'interact' && getTargetRef.current() !== null;
      // keydown is a valid activation gesture (Enter or E on the capture overlay).
      dispatch(
        { type: 'KEY_DOWN', role, code: e.code, repeat: e.repeat, accepted, hasTarget },
        true,
      );
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const role = keyRole(e.code);
      // Always release, even for keys that were not accepted, so none can stick.
      if (role !== null && role !== 'interact') {
        heldKeysRef.current = reduceHeldKeys(heldKeysRef.current, { type: 'up', role });
      }
      dispatch({ type: 'KEY_UP', role }, false);
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      // Clicks on overlay buttons or form fields are not canvas activations.
      const tag = target?.tagName?.toUpperCase();
      if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      dispatch({ type: 'CANVAS_CLICK' }, true);
    };

    const onBlurOrHidden = () => {
      dispatch({ type: 'WINDOW_BLUR_OR_HIDDEN' }, false);
    };
    const onVisibility = () => {
      if (doc.visibilityState === 'hidden') onBlurOrHidden();
    };

    const detachLock = attachPointerLockListeners(doc, {
      onChange: (locked) => {
        if (locked && stateRef.current.mode === 'inspecting') {
          // A late grant arrived after inspecting began. Give it back.
          exitLock(doc);
        } else {
          dispatch({ type: locked ? 'LOCK_ACQUIRED' : 'LOCK_LOST' }, false);
        }
        clearInput();
      },
      onError: () => dispatch({ type: 'LOCK_DENIED' }, false),
      onMouseMove: (dx, dy) => {
        if (stateRef.current.mode !== 'active') return;
        mouseDeltaRef.current.x += dx;
        mouseDeltaRef.current.y += dy;
      },
    });

    wrapper.addEventListener('keydown', onKeyDown);
    wrapper.addEventListener('keyup', onKeyUp);
    wrapper.addEventListener('click', onClick);
    win?.addEventListener('blur', onBlurOrHidden);
    doc.addEventListener('visibilitychange', onVisibility);

    return () => {
      wrapper.removeEventListener('keydown', onKeyDown);
      wrapper.removeEventListener('keyup', onKeyUp);
      wrapper.removeEventListener('click', onClick);
      win?.removeEventListener('blur', onBlurOrHidden);
      doc.removeEventListener('visibilitychange', onVisibility);
      detachLock();
      if (isLocked(doc)) exitLock(doc);
      clearInput();
    };
  }, [wrapperRef, lockElementRef, mouseDeltaRef, clearMouseDelta]);

  return { mode, keyboardLookHint, getMode, heldKeysRef, mouseDeltaRef, consumeMouseDelta };
}
