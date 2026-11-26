import { Component, useCallback, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import type { StationId } from '../core/contracts';
import { createWorldAudio } from './audio/engineFactory';
import { SILENT_TRACK, type WorldAudioEngine } from './audio/worldAudio';
import { FrameSamplerHost } from './controller/useFrameSampler';
import { usePlayerRig } from './controller/usePlayerRig';
import { useWorldInput, type WorldInput } from './controller/useWorldInput';
import { WebglFallback } from './overlay/WebglFallback';
import { WorldOverlay } from './overlay/WorldOverlay';
import {
  initialPropState,
  reduceCardPage,
  reduceCloseCard,
  reducePropInteract,
  isTurntableCard,
  reduceTargetChange,
  type PropState,
} from './logic/propState';
import type { CardPage } from './logic/archiveDocuments';
import type { CardScroll } from './logic/inputState';
import { INTERACTABLE_DEFS } from './layout/roomLayout';
import type { InteractionTarget, PropInteractableId, Vec2 } from './worldTypes';
import { Effects } from './scene/Effects';
import { countLampsOn } from './scene/lampCoupling';
import { Lighting } from './scene/Lighting';
import { DESK_LAMPS } from './scene/modelDetail';
import { Props } from './scene/Props';
import { Room } from './scene/Room';
import { Stations } from './scene/Stations';
import { WorldCanvas } from './scene/WorldCanvas';

export interface WorldSceneProps {
  onInspect: (station: StationId) => void;
  memoryShifted: boolean;
  /** Optional. Absent behaves as before. When supplied, false suspends world input. */
  inputEnabled?: boolean;
}

/** Delay before a lost WebGL context without restore switches to the fallback. */
const CONTEXT_RESTORE_TIMEOUT_MS = 3000;

/** Pixels per ArrowUp / ArrowDown press while a card is open. */
const CARD_LINE_SCROLL_PX = 48;
/** Overlap kept between pages when PageUp / PageDown scroll the card. */
const CARD_PAGE_OVERLAP_PX = 32;

const WORLD_LABEL =
  'First-person 3D archive room. Click the scene to capture the mouse. ' +
  'Move with W A S D, look with the mouse, and press E near a station to inspect it. ' +
  'Press Escape to release the mouse. Station messages, including why a station cannot be used yet, ' +
  'appear in the status line at the bottom of the screen.';

function hasWebgl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Runs inside the Canvas (R3F context): player rig and WebGL context-loss watch. */
function PlayerRigHost({
  input,
  getTargetRef,
  onTargetChange,
  memoryShifted,
  getCardAnchor,
  onCardAutoClose,
  onContextLost,
  onContextRestored,
}: {
  input: WorldInput;
  getTargetRef: { current: () => InteractionTarget | null };
  onTargetChange: (target: InteractionTarget | null) => void;
  memoryShifted: boolean;
  getCardAnchor: () => Vec2 | null;
  onCardAutoClose: () => void;
  onContextLost: () => void;
  onContextRestored: () => void;
}) {
  const rig = usePlayerRig({
    heldKeysRef: input.heldKeysRef,
    consumeMouseDelta: input.consumeMouseDelta,
    clearEpochRef: input.clearEpochRef,
    getMode: input.getMode,
    onTargetChange,
    memoryShifted,
    getCardAnchor,
    onCardAutoClose,
  });
  getTargetRef.current = rig.getTarget;

  const domElement = useThree((s) => s.gl.domElement);
  useEffect(() => {
    const lost = (e: Event) => {
      e.preventDefault(); // allows the browser to restore the context
      onContextLost();
    };
    domElement.addEventListener('webglcontextlost', lost);
    domElement.addEventListener('webglcontextrestored', onContextRestored);
    return () => {
      domElement.removeEventListener('webglcontextlost', lost);
      domElement.removeEventListener('webglcontextrestored', onContextRestored);
    };
  }, [domElement, onContextLost, onContextRestored]);

  return null;
}

type GetAudio = () => WorldAudioEngine;

/**
 * One audio engine per WorldScene mount. It is created lazily (never during render, never before an effect or event
 * handler asks for it) and disposed on unmount. The ref is cleared on cleanup, so React StrictMode's simulated
 * unmount / remount gets a fresh engine instead of a disposed one.
 */
function useWorldAudioEngine(): GetAudio {
  const ref = useRef<WorldAudioEngine | null>(null);
  const get = useCallback<GetAudio>(() => {
    if (ref.current === null) ref.current = createWorldAudio();
    return ref.current;
  }, []);
  useEffect(
    () => () => {
      ref.current?.dispose();
      ref.current = null;
    },
    [],
  );
  return get;
}

/** Plays the SFX of a station request. The arcade coin also sounds when the App then shows its lock message (the coin is rejected). */
function playStationSfx(audio: WorldAudioEngine, id: StationId): void {
  if (id === 'vhs') audio.playVhsInsertSfx();
  else if (id === 'arcade') audio.playArcadeCoinSfx();
}

function WorldInteractive({
  onInspect,
  memoryShifted,
  inputEnabled,
  onFail,
  getAudio,
}: WorldSceneProps & { onFail: () => void; getAudio: GetAudio }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const getTargetRef = useRef<() => InteractionTarget | null>(() => null);
  const [target, setTarget] = useState<InteractionTarget | null>(null);
  // World-local prop state: lamp on/off and the latest prop message. Session-only, never persisted.
  const [propState, setPropState] = useState<PropState>(initialPropState);
  // Audio is a side effect only: it never changes what the world sends to onInspect.
  const [audioMuted, setAudioMuted] = useState(false);
  // React mirror of the audio engine's track selection and playing state, so the card, the prompt and the 3D model re-render.
  // Playing means a music track 0..3 is selected AND the engine is unlocked (engine.isPlaying()); mute does not change it.
  const [audioTrack, setAudioTrack] = useState<{ track: number; playing: boolean }>({ track: 0, playing: false });
  const syncAudioTrack = useCallback(() => {
    const audio = getAudio();
    const next = { track: audio.getTrack(), playing: audio.isPlaying() };
    setAudioTrack((prev) => (prev.track === next.track && prev.playing === next.playing ? prev : next));
  }, [getAudio]);
  const onGesture = useCallback(() => {
    getAudio().unlock();
    syncAudioTrack();
  }, [getAudio, syncAudioTrack]);
  // Initialise the mirror from the engine after mount (never during render, so the engine is not created while rendering).
  useEffect(() => {
    syncAudioTrack();
  }, [syncAudioTrack]);
  const onToggleMute = useCallback(() => {
    const audio = getAudio();
    audio.unlock();
    setAudioMuted(audio.toggleMuted());
    syncAudioTrack();
  }, [getAudio, syncAudioTrack]);
  const cardOpenRef = useRef(false);
  const cardPageRef = useRef<CardPage>(1);
  const turntableOpenRef = useRef(false);
  const onPropInteract = useCallback(
    (id: PropInteractableId) => {
      const audio = getAudio();
      if (cardOpenRef.current) {
        // E closes the open card: silent.
      } else if (id === 'desk-lamp-left' || id === 'desk-lamp-right') {
        audio.playLampSwitchSfx();
      } else if (id === 'record-player') {
        // Opening the turntable catalog card is silent (no page to turn).
      } else {
        audio.playPageRustleSfx();
        cardPageRef.current = 1;
      }
      setPropState((s) => reducePropInteract(s, id));
    },
    [getAudio],
  );
  // Archive Document Card. The anchor and open flag live in refs so the per-frame distance check and the key handler
  // read them without React state churn. Closing is idempotent.
  const cardAnchorRef = useRef<Vec2 | null>(null);
  const closeCard = useCallback(() => {
    cardAnchorRef.current = null;
    cardOpenRef.current = false;
    turntableOpenRef.current = false;
    cardPageRef.current = 1;
    setPropState((s) => reduceCloseCard(s));
  }, []);
  // A page rustle only when the visible page really changes (not for the page that is already shown).
  const onCardPage = useCallback(
    (page: CardPage) => {
      if (cardOpenRef.current && cardPageRef.current !== page) {
        cardPageRef.current = page;
        getAudio().playPageRustleSfx();
      }
      setPropState((s) => reduceCardPage(s, page));
    },
    [getAudio],
  );
  // Selects a turntable track (keys 1 to 5 or a row click). Selecting the active track does nothing (no SFX). The needle-drop
  // SFX plays only when a music track (0..3) starts; STOP (index 4) lifts the needle silently: the engine just fades the music out.
  const selectTrack = useCallback(
    (index: number) => {
      if (!cardOpenRef.current || !turntableOpenRef.current) return;
      const audio = getAudio();
      if (audio.getTrack() === index) return;
      audio.setTrack(index);
      // A row click is a user gesture too (the wrapper skips clicks inside the card); unlock after the selection, so the chosen track starts.
      audio.unlock();
      if (index !== SILENT_TRACK) audio.playVinylNeedleDropSfx();
      syncAudioTrack();
    },
    [getAudio, syncAudioTrack],
  );
  // Digits 1 and 2 switch a document page, or select tracks 1 and 2 on the turntable card.
  const onCardPageOrTrack = useCallback(
    (page: CardPage) => {
      if (turntableOpenRef.current) selectTrack(page - 1);
      else onCardPage(page);
    },
    [onCardPage, selectTrack],
  );
  // Digits 3 to 5 select tracks on the turntable card only; on a document card they do nothing.
  const onCardTrack = useCallback((index: 2 | 3 | 4) => selectTrack(index), [selectTrack]);
  const getCardAnchor = useCallback(() => cardAnchorRef.current, []);
  const isCardOpen = useCallback(() => cardOpenRef.current, []);
  const onCardScroll = useCallback((s: CardScroll) => {
    const el = wrapperRef.current?.querySelector<HTMLElement>('[data-world-card]');
    if (!el) return;
    const px = s.kind === 'line' ? CARD_LINE_SCROLL_PX : Math.max(CARD_LINE_SCROLL_PX, el.clientHeight - CARD_PAGE_OVERLAP_PX);
    el.scrollTop += s.dir * px;
  }, []);
  const inspectStation = useCallback(
    (id: StationId) => {
      closeCard(); // opening a station closes any open card
      playStationSfx(getAudio(), id);
      onInspect(id);
    },
    [closeCard, onInspect, getAudio],
  );
  const onTargetChange = useCallback((t: InteractionTarget | null) => {
    setTarget(t);
    setPropState((s) => reduceTargetChange(s, t));
  }, []);
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getTarget = useCallback(() => getTargetRef.current(), []);
  const input = useWorldInput({
    wrapperRef,
    onInspect: inspectStation,
    getTarget,
    onPropInteract,
    onCloseCard: closeCard,
    isCardOpen,
    onCardPage: onCardPageOrTrack,
    onCardTrack,
    onCardScroll,
    inputEnabled,
    onGesture,
    onToggleMute,
  });
  // Duck the music while a station panel is open. Driven by the mode, not by the frame loop.
  const inspectingMode = input.mode === 'inspecting';
  useEffect(() => {
    getAudio().setDucked(inspectingMode);
  }, [inspectingMode, getAudio]);
  // Suspend audio while the tab is hidden. Never unlocks.
  useEffect(() => {
    const onVisibility = () => getAudio().setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [getAudio]);
  const onAudioTick = useCallback((elapsed: number) => getAudio().tick(elapsed), [getAudio]);
  // Keep the refs in step with the committed state (the open card id is the single source).
  const openCard = propState.openCard;
  const { releaseCardArrows } = input;
  useEffect(() => {
    cardOpenRef.current = openCard !== null;
    turntableOpenRef.current = isTurntableCard(openCard);
    cardPageRef.current = 1;
    cardAnchorRef.current = openCard === null ? null : (INTERACTABLE_DEFS.find((d) => d.id === openCard)?.anchor ?? null);
    // ArrowUp / ArrowDown scroll the card now, so movement they were driving stops.
    if (openCard !== null) releaseCardArrows();
  }, [openCard, releaseCardArrows]);
  // The station panel opening (inspecting) closes the card.
  useEffect(() => {
    if (input.mode === 'inspecting') closeCard();
  }, [input.mode, closeCard]);

  const clearTimer = useCallback(() => {
    if (restoreTimer.current !== null) {
      clearTimeout(restoreTimer.current);
      restoreTimer.current = null;
    }
  }, []);
  // Error-handling timer only. It never resumes input.
  const handleContextLost = useCallback(() => {
    clearTimer();
    restoreTimer.current = setTimeout(onFail, CONTEXT_RESTORE_TIMEOUT_MS);
  }, [clearTimer, onFail]);
  useEffect(() => clearTimer, [clearTimer]);

  return (
    <div className="world-wrapper" ref={wrapperRef} tabIndex={0} role="group" aria-label={WORLD_LABEL}>
      <WorldCanvas frameloop={input.mode === 'inspecting' ? 'demand' : 'always'}>
        <Lighting memoryShifted={memoryShifted} lampsOn={countLampsOn(propState.lampOn, DESK_LAMPS.map((l) => l.id))} />
        <Room />
        <Props lampOn={propState.lampOn} turntablePlaying={audioTrack.playing} turntableTrack={audioTrack.track} />
        <Stations />
        <Effects active={input.mode !== 'inspecting'} onAudioTick={onAudioTick} />
        <FrameSamplerHost />
        <PlayerRigHost
          input={input}
          getTargetRef={getTargetRef}
          onTargetChange={onTargetChange}
          memoryShifted={memoryShifted}
          getCardAnchor={getCardAnchor}
          onCardAutoClose={closeCard}
          onContextLost={handleContextLost}
          onContextRestored={clearTimer}
        />
      </WorldCanvas>
      <WorldOverlay mode={input.mode} target={target} lampOn={propState.lampOn} message={propState.message} card={propState.openCard} cardPage={propState.cardPage} onCardPage={onCardPage} track={audioTrack.track} playingTrack={audioTrack.playing ? audioTrack.track : null} onTrack={selectTrack} notesRead={propState.read.size} canResume={inputEnabled === undefined} keyboardLookHint={input.keyboardLookHint} audioMuted={audioMuted} onToggleAudio={onToggleMute} />
    </div>
  );
}

function FallbackView({ onInspect, getAudio }: { onInspect: (station: StationId) => void; getAudio: GetAudio }) {
  // The button click is the user gesture: unlock, then play the station SFX, then report the request.
  const inspect = useCallback(
    (id: StationId) => {
      const audio = getAudio();
      audio.unlock();
      playStationSfx(audio, id);
      onInspect(id);
    },
    [getAudio, onInspect],
  );
  return (
    <div className="world-wrapper" tabIndex={-1}>
      <WebglFallback onInspect={inspect} />
    </div>
  );
}

class WorldErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('World rendering failed', error, info.componentStack);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function WorldScene({ onInspect, memoryShifted, inputEnabled }: WorldSceneProps) {
  const [webgl] = useState(hasWebgl);
  const [failed, setFailed] = useState(false);
  const fail = useCallback(() => setFailed(true), []);

  const getAudio = useWorldAudioEngine();

  const fallback = <FallbackView onInspect={onInspect} getAudio={getAudio} />;
  if (!webgl || failed) return fallback;
  return (
    <WorldErrorBoundary fallback={fallback}>
      <WorldInteractive onInspect={onInspect} memoryShifted={memoryShifted} inputEnabled={inputEnabled} onFail={fail} getAudio={getAudio} />
    </WorldErrorBoundary>
  );
}
