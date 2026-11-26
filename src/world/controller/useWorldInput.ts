// DOM input controller. Binds DOM events to the pure input modules and
// performs the effects they return. No arcade/memories imports, no storage.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { StationId } from '../../core/contracts';
import type { InteractionTarget, PropInteractableId } from '../worldTypes';
import {
  initialModeState,
  reduceMode,
  type InputMode,
  type ModeEvent,
  type ModeState,
} from '../logic/inputMode';
import {
  EMPTY_HELD_KEYS,
  cardScrollFor,
  isActionRole,
  isKeyEventAccepted,
  keyRole,
  reduceHeldKeys,
  type CardScroll,
  type HeldKeys,
  type KeyRole,
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
  getTarget: () => InteractionTarget | null;
  /** Called when E is pressed on a world-local prop (lamp or manual). Read through a ref. Never calls onInspect. */
  onPropInteract?: (id: PropInteractableId) => void;
  /**
   * Closes the open Archive Document Card (E on nothing, Escape, pointer lock lost). Read through a ref. Must be
   * idempotent: it can be called when no card is open.
   */
  onCloseCard?: () => void;
  /** Returns true while a card is open. Read at key time. */
  isCardOpen?: () => boolean;
  /** Called when key 1 or 2 is pressed while a card is open. Read through a ref. Never releases pointer lock. */
  onCardPage?: (page: 1 | 2) => void;
  /**
   * Scrolls the open card (ArrowUp / ArrowDown by a line, PageUp / PageDown by a page). Read through a ref. While a
   * card is open ArrowUp / ArrowDown call this instead of moving the player.
   */
  onCardScroll?: (scroll: CardScroll) => void;
  /** Optional external switch. Absent means unchanged default behavior. */
  inputEnabled?: boolean;
  /**
   * Called synchronously from a real user gesture inside the wrapper: an accepted, non-repeated keydown, or a click that
   * is not on a button, form field or the card. Used to unlock audio. Read through a ref.
   */
  onGesture?: () => void;
  /** Called when KeyM is pressed (accepted, not repeated, no Ctrl / Meta / Alt). Read through a ref. */
  onToggleMute?: () => void;
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
  /** Incremented every time input is cleared (CLEAR_INPUT, blur). The rig snaps its smoothing state when it changes. */
  clearEpochRef: { current: number };
  /** Stops forward / backward movement that comes only from ArrowUp / ArrowDown. Call when a card opens. */
  releaseCardArrows: () => void;
}

export function useWorldInput(options: UseWorldInputOptions): WorldInput {
  const { wrapperRef, lockElementRef } = options;
  const { mouseDeltaRef, consumeMouseDelta, clearMouseDelta } = usePointerLock();

  const stateRef = useRef<ModeState>(initialModeState(options.inputEnabled));
  // Set by the listener effect; lets the prop effect run the reducer and its effects.
  const dispatchRef = useRef<((event: ModeEvent, gesture: boolean) => void) | null>(null);
  const prevInputEnabledRef = useRef<boolean | undefined>(options.inputEnabled);
  const heldKeysRef = useRef<HeldKeys>(EMPTY_HELD_KEYS);
  const clearEpochRef = useRef(0);
  const [mode, setMode] = useState<InputMode>(stateRef.current.mode);
  const [keyboardLookHint, setKeyboardLookHint] = useState<boolean>(false);

  // Latest callbacks, read at event time.
  const onInspectRef = useRef(options.onInspect);
  const getTargetRef = useRef(options.getTarget);
  const onPropInteractRef = useRef(options.onPropInteract);
  const onCloseCardRef = useRef(options.onCloseCard);
  const isCardOpenRef = useRef(options.isCardOpen);
  const onCardPageRef = useRef(options.onCardPage);
  const onCardScrollRef = useRef(options.onCardScroll);
  const onGestureRef = useRef(options.onGesture);
  const onToggleMuteRef = useRef(options.onToggleMute);
  // Physical codes of the held movement keys, so two keys sharing a role (W and ArrowUp) release independently.
  const physicalRef = useRef<Set<string>>(new Set());
  const releaseArrowsRef = useRef<() => void>(() => undefined);
  onInspectRef.current = options.onInspect;
  getTargetRef.current = options.getTarget;
  onPropInteractRef.current = options.onPropInteract;
  onCloseCardRef.current = options.onCloseCard;
  isCardOpenRef.current = options.isCardOpen;
  onCardPageRef.current = options.onCardPage;
  onCardScrollRef.current = options.onCardScroll;
  onGestureRef.current = options.onGesture;
  onToggleMuteRef.current = options.onToggleMute;

  const getMode = useCallback((): InputMode => stateRef.current.mode, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;
    const doc = wrapper.ownerDocument;
    const win = doc.defaultView;

    const getLockElement = (): HTMLElement => lockElementRef?.current ?? wrapper;

    const releaseRoleIfFree = (role: KeyRole) => {
      for (const code of physicalRef.current) if (keyRole(code) === role) return;
      heldKeysRef.current = reduceHeldKeys(heldKeysRef.current, { type: 'up', role });
    };
    releaseArrowsRef.current = () => {
      for (const code of ['ArrowUp', 'ArrowDown']) physicalRef.current.delete(code);
      releaseRoleIfFree('forward');
      releaseRoleIfFree('backward');
    };

    const clearInput = () => {
      physicalRef.current.clear();
      clearEpochRef.current += 1;
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
            if (target !== null && target.type === 'station') onInspectRef.current(target.station.id);
            break;
          }
          case 'PROP_INTERACT':
            onPropInteractRef.current?.(effect.id);
            break;
          case 'CLOSE_CARD':
            onCloseCardRef.current?.();
            break;
          case 'CARD_PAGE':
            onCardPageRef.current?.(effect.page);
            break;
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

    dispatchRef.current = dispatch;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as Element | null;
      const role = keyRole(e.code);
      const accepted = isKeyEventAccepted({
        tagName: target?.tagName ?? '',
        isContentEditable: (target as HTMLElement | null)?.isContentEditable === true,
        insideWorldWrapper: target instanceof Node && wrapper.contains(target),
      });
      const modeBefore = stateRef.current.mode;
      // An accepted keydown is a user gesture: unlock audio first, so SFX triggered below can sound.
      if (accepted && !e.repeat) onGestureRef.current?.();
      // KeyM toggles audio in every mode, including while pointer-locked and while a card is open.
      const isMute = accepted && role === 'mute' && !e.ctrlKey && !e.metaKey && !e.altKey;
      if (isMute && !e.repeat) onToggleMuteRef.current?.();
      // Escape closes an open card. It is never prevented: the browser also uses it to release pointer lock.
      if (accepted && e.code === 'Escape') onCloseCardRef.current?.();

      const cardOpen = isCardOpenRef.current?.() === true;
      const isPageKey = role === 'page1' || role === 'page2';
      const scroll = cardOpen ? cardScrollFor(e.code) : null;
      // Keys claimed only while a card is open (1, 2, PageUp, PageDown).
      const cardOnlyKey = isPageKey || role === 'scrollPageUp' || role === 'scrollPageDown';
      // Movement and look keys are held. E, the page keys and PageUp / PageDown are one-shot and are never held.
      // While a card is open, ArrowUp / ArrowDown scroll the card and are not held.
      if (accepted && role !== null && !isActionRole(role) && modeBefore !== 'inspecting' && !(scroll !== null && e.code.startsWith('Arrow'))) {
        heldKeysRef.current = reduceHeldKeys(heldKeysRef.current, { type: 'down', role });
        physicalRef.current.add(e.code);
      }
      if (accepted && scroll !== null && modeBefore !== 'inspecting') onCardScrollRef.current?.(scroll);
      // preventDefault only for used keys while not inspecting. Esc is never touched.
      // Keys 1 and 2 are claimed only while a card is open.
      if (accepted && role !== null && modeBefore !== 'inspecting' && e.code !== 'Escape' && (!cardOnlyKey || cardOpen)) {
        e.preventDefault();
      } else if (isMute) {
        e.preventDefault(); // KeyM is also claimed while inspecting
      }

      const current = role === 'interact' ? getTargetRef.current() : null;
      const hasTarget = current !== null;
      const targetKind = current === null ? null : current.type;
      const targetPropId = current !== null && current.type === 'prop' ? current.prop.id : null;
      // keydown is a valid activation gesture (Enter or E on the capture overlay).
      dispatch(
        {
          type: 'KEY_DOWN',
          role,
          code: e.code,
          repeat: e.repeat,
          accepted,
          hasTarget,
          targetKind,
          targetPropId,
          cardOpen: role === 'interact' || isPageKey ? cardOpen : false,
        },
        true,
      );
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const role = keyRole(e.code);
      // Always release, even for keys that were not accepted, so none can stick.
      if (role !== null && !isActionRole(role)) {
        physicalRef.current.delete(e.code);
        releaseRoleIfFree(role);
      }
      dispatch({ type: 'KEY_UP', role }, false);
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      // Clicks inside the document card (body or scrollbar) never capture the pointer.
      if (target?.closest?.('[data-world-card]')) return;
      // Clicks on overlay buttons or form fields are not canvas activations.
      const tag = target?.tagName?.toUpperCase();
      if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      onGestureRef.current?.();
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
        // Losing the lock (Esc in the browser) closes an open card.
        if (!locked) onCloseCardRef.current?.();
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
      dispatchRef.current = null;
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

  // EXTERNAL_ENABLED only when a supplied value changes. Not on mount, not when
  // absent, not on unrelated re-renders. Never requests pointer lock (gesture=false).
  const { inputEnabled } = options;
  useEffect(() => {
    const prev = prevInputEnabledRef.current;
    prevInputEnabledRef.current = inputEnabled;
    if (inputEnabled === undefined || inputEnabled === prev) return;
    dispatchRef.current?.({ type: 'EXTERNAL_ENABLED', value: inputEnabled }, false);
  }, [inputEnabled]);

  const releaseCardArrows = useCallback(() => releaseArrowsRef.current(), []);

  return { mode, keyboardLookHint, getMode, heldKeysRef, mouseDeltaRef, consumeMouseDelta, clearEpochRef, releaseCardArrows };
}
