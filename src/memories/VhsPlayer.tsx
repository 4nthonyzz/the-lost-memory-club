import { useEffect, useReducer, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { MEMORY_ID } from '../core/contracts';
import { createVhsAudio, tensionLevel, type VhsAudio } from './audio/vhsAudio';
import { PERFECT_TRACKING_CLUE_ID } from './fragments/memoryCatalog';
import { getPlayerStrings, type Language } from './i18n';
import { createTransportState, transportReducer } from './restoration/transportReducer';
import { TRANSPORT_FPS, type ClueDetection, type TapeDefinition, type TransportState } from './restoration/types';
import { subtitleAt } from './subtitles';
import { createVhsRenderer, SCREEN_HEIGHT, SCREEN_WIDTH } from './vhsRenderer';
import { computeVisualParams, formatClock, formatTimecode } from './vhsVisuals';
import './VhsPlayer.css';

export interface VhsPlayerProps {
  tape: TapeDefinition;
  /** Kept for compatibility. The tape is chosen by the world; the player has no tape menu. */
  inventory?: readonly TapeDefinition[];
  onSelectTape?: (tape: TapeDefinition) => void;
  language: Language;
  reducedDistortion: boolean;
  muted: boolean;
  onMutedChange?: (muted: boolean) => void;
  onClueDetected: (detection: ClueDetection) => void;
  onEvidenceCaptured?: (detection: ClueDetection, image: string) => void;
  onPhotoCaptured?: (tapeId: string, photoId: string) => void;
  onClose: () => void;
}

type NoticeKind = 'clue' | 'perfect' | 'photo';

const NOTICE_DURATION_MS = 3500;
/** Seconds before and after a clue window in which the photo viewfinder is offered. */
const CAPTURE_LEAD = 1;
const CAPTURE_TAIL = 2.5;

/** The tape is already in the deck (the 3D insertion played first): load it with a clean signal and start playing at 0. */
function createPlayingState(tape: TapeDefinition): TransportState {
  let state = transportReducer(createTransportState(), { type: 'LOAD_TAPE', tape });
  state = transportReducer(state, { type: 'SET_TRACKING', value: tape.idealTracking });
  return transportReducer(state, { type: 'PLAY' });
}

export function VhsPlayerContent({ tape, language, reducedDistortion, muted, onClueDetected, onEvidenceCaptured, onPhotoCaptured, onClose }: VhsPlayerProps) {
  const strings = getPlayerStrings(language);
  const [state, dispatch] = useReducer(transportReducer, tape, createPlayingState);
  const [notice, setNotice] = useState<NoticeKind | null>(null);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [flash, setFlash] = useState(false);
  const [ejecting, setEjecting] = useState(false);

  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const reducedRef = useRef(reducedDistortion);
  const reportedRef = useRef<Set<string>>(new Set());
  const previousModeRef = useRef(state.mode);
  const audioRef = useRef<VhsAudio | null>(null);

  const params = computeVisualParams(state, reducedDistortion);
  const subtitle = subtitleAt(tape.id, state.position, language);
  const playing = state.mode === 'playing';
  const captureReady =
    !photoTaken &&
    tape.clueWindows.some((w) => state.position >= w.startFrame / TRANSPORT_FPS - CAPTURE_LEAD && state.position <= w.endFrame / TRANSPORT_FPS + CAPTURE_TAIL);
  const photoId = `${tape.id}-memory`;
  const anomalyZones = tape.clueWindows.map((window) => ({
    key: window.clueId,
    left: (window.startFrame / TRANSPORT_FPS / tape.duration) * 100,
    width: ((window.endFrame - window.startFrame) / TRANSPORT_FPS / tape.duration) * 100,
  }));

  useEffect(() => {
    stateRef.current = state;
    reducedRef.current = reducedDistortion;
  });

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  useEffect(() => {
    const audio = createVhsAudio();
    audioRef.current = audio;
    // The E press that started the insertion is the user gesture; the context may resume now.
    void audio.resume().catch(() => undefined);
    return () => {
      audio.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    try {
      audioRef.current?.update({
        mode: state.mode,
        signalQuality: state.signalQuality,
        tension: tensionLevel(params.reveal, state.mode),
        muted,
        reducedDistortion,
      });
    } catch {
      audioRef.current?.dispose();
      audioRef.current = null;
    }
  }, [state.mode, state.signalQuality, params.reveal, muted, reducedDistortion]);

  useEffect(() => {
    if (previousModeRef.current === state.mode) return;
    previousModeRef.current = state.mode;
    try {
      audioRef.current?.click();
    } catch {
      audioRef.current?.dispose();
      audioRef.current = null;
    }
  }, [state.mode]);

  // A clue counts as found when the film plays through its moment. No pausing or tuning is required.
  useEffect(() => {
    for (const window of tape.clueWindows) {
      if (reportedRef.current.has(window.clueId)) continue;
      if (state.position < window.startFrame / TRANSPORT_FPS + 0.4) continue;
      reportedRef.current.add(window.clueId);
      const detection: ClueDetection = { tapeId: tape.id, clueId: window.clueId };
      onClueDetected(detection);
      try {
        const image = canvasRef.current?.toDataURL('image/png');
        if (image) onEvidenceCaptured?.(detection, image);
      } catch {
        // Evidence capture is optional and cannot interrupt the story.
      }
      setNotice(tape.id === MEMORY_ID && window.clueId === PERFECT_TRACKING_CLUE_ID ? 'perfect' : 'clue');
    }
  }, [state.position, tape, onClueDetected, onEvidenceCaptured]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(false), 260);
    return () => clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: ReturnType<typeof createVhsRenderer> = null;
    try {
      renderer = createVhsRenderer(canvas);
    } catch {
      renderer = null;
    }
    let frameId = 0;
    let last = performance.now();
    const loop = (now: number) => {
      try {
        const seconds = Math.min(0.1, Math.max(0, (now - last) / 1000));
        last = now;
        const current = stateRef.current;
        if (current.mode === 'playing' || current.mode === 'rewind' || current.mode === 'ffwd') {
          dispatch({ type: 'TICK', seconds });
        }
        renderer?.draw({
          tapeId: current.tape?.id ?? '',
          time: Number.isFinite(now) ? now / 1000 : 0,
          position: current.position,
          mode: current.mode,
          params: computeVisualParams(current, reducedRef.current),
        });
      } catch {
        const context = canvas.getContext('2d');
        if (context) {
          context.fillStyle = '#090b12';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.fillStyle = '#d6dbe9';
          context.font = '14px monospace';
          context.fillText('VHS', 18, 28);
        }
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  function wakeAudio(): void {
    try {
      void audioRef.current?.resume();
    } catch {
      audioRef.current?.dispose();
      audioRef.current = null;
    }
  }

  function togglePlayback(): void {
    dispatch({ type: playing ? 'PAUSE' : 'PLAY' });
  }

  function eject(): void {
    if (ejecting) return;
    setEjecting(true);
    window.setTimeout(onClose, 350);
  }

  /** Takes the Polaroid without pausing the tape. */
  function capturePhoto(): void {
    if (!captureReady) return;
    try {
      const image = canvasRef.current?.toDataURL('image/png');
      if (image) onEvidenceCaptured?.({ tapeId: tape.id, clueId: photoId }, image);
    } catch {
      // Capturing a photo is optional and must not interrupt playback.
    }
    onPhotoCaptured?.(tape.id, photoId);
    setPhotoTaken(true);
    setFlash(!reducedDistortion);
    setNotice('photo');
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>): void {
    wakeAudio();
    if (event.target instanceof HTMLButtonElement && (event.key === ' ' || event.key === 'Enter')) return;
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      if (captureReady) capturePhoto();
      else togglePlayback();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      eject();
    }
  }

  const noticeText = notice === 'perfect' ? strings.perfectTracking : notice === 'photo' ? strings.captured : strings.clueRecorded;
  const rootClass = ['vhs-player', 'vhs-player--film', reducedDistortion ? 'vhs-player--reduced' : '', ejecting ? 'vhs-player--ejecting' : ''].filter(Boolean).join(' ');

  return (
    <section ref={rootRef} className={rootClass} aria-label={strings.region} translate="no" tabIndex={-1} onKeyDown={handleKeyDown} onPointerDown={wakeAudio}>
      <div className="vhs-tv" translate="no">
        <div className="vhs-screen" role="img" aria-label={strings.screenLabel}>
          <canvas ref={canvasRef} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} />
          <div className="vhs-tint" aria-hidden="true" />
          <div className="vhs-scanlines" aria-hidden="true" />
          <div className="vhs-rgb" aria-hidden="true" />
          <div className="vhs-osd" aria-hidden="true" translate="no">
            <span className="vhs-osd__mode">{playing ? `PLAY ${'\u25b6'}` : strings.modes[state.mode]}</span>
            <span className="vhs-osd__time">{formatTimecode(state.position)}</span>
          </div>
          {flash && <div className="vhs-flash" aria-hidden="true" />}
          {notice && (
            <div className={`vhs-notice vhs-notice--${notice}`} role="status" translate="no">
              {noticeText}
            </div>
          )}
          {captureReady && (
            <button type="button" className="vhs-capture-prompt" onClick={capturePhoto} translate="no">
              <span aria-hidden="true">{'\u25c9'}</span> {strings.capturePrompt}
            </button>
          )}
        </div>
      </div>
      <p className="vhs-subtitle" lang={language} translate="no">{subtitle ?? '\u00a0'}</p>

      <div className="vhs-timeline" translate="no">
        <div className="vhs-timeline__track">
          {anomalyZones.map((zone) => (
            <span key={zone.key} className="vhs-timeline__zone" style={{ left: `${zone.left}%`, width: `${zone.width}%` }} />
          ))}
          <input
            type="range"
            className="vhs-timeline__input"
            min={0}
            max={tape.duration}
            step={0.04}
            value={Math.min(state.position, tape.duration)}
            aria-label={strings.timeline}
            aria-valuetext={`${formatClock(state.position)} / ${formatClock(tape.duration)}`}
            onChange={(event) => dispatch({ type: 'SEEK', position: Number(event.currentTarget.value) })}
          />
        </div>
        <div className="vhs-timeline__times" aria-hidden="true">
          <span>{formatClock(state.position)}</span>
          <span>{formatClock(tape.duration)}</span>
        </div>
      </div>

      <div className="vhs-controls vhs-controls--minimal" translate="no">
        <button type="button" className="vhs-controls__main" onClick={togglePlayback}>
          {playing ? `\u275a\u275a ${strings.pause}` : `\u25b6 ${strings.play}`}
        </button>
        <button type="button" className="vhs-secondary" onClick={eject}>
          {'\u23cf'} {strings.close}
        </button>
      </div>
    </section>
  );
}
