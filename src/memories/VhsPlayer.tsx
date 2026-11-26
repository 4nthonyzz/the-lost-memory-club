import { useEffect, useReducer, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { MEMORY_ID } from '../core/contracts';
import { createVhsAudio, tensionLevel, type VhsAudio } from './audio/vhsAudio';
import { PERFECT_TRACKING_CLUE_ID } from './fragments/memoryCatalog';
import { getPlayerStrings, type Language } from './i18n';
import { commandForKey } from './keyboardControls';
import { createTransportState, newDetections, transportReducer } from './restoration/transportReducer';
import type { ClueDetection, TapeDefinition, TransportAction, TransportState } from './restoration/types';
import { subtitleAt } from './subtitles';
import { createVhsRenderer, SCREEN_HEIGHT, SCREEN_WIDTH } from './vhsRenderer';
import { computeVisualParams, formatClock, formatTimecode } from './vhsVisuals';
import { TRANSPORT_FPS } from './restoration/types';
import './VhsPlayer.css';

export interface VhsPlayerProps {
  tape: TapeDefinition;
  inventory?: readonly TapeDefinition[];
  onSelectTape?: (tape: TapeDefinition) => void;
  language: Language;
  reducedDistortion: boolean;
  muted: boolean;
  onMutedChange?: (muted: boolean) => void;
  onClueDetected: (detection: ClueDetection) => void;
  onEvidenceCaptured?: (detection: ClueDetection, image: string) => void;
  onClose: () => void;
}

type NoticeKind = 'clue' | 'perfect';

const NOTICE_DURATION_MS = 4500;

function createLoadedState(tape: TapeDefinition): TransportState {
  return transportReducer(createTransportState(), { type: 'LOAD_TAPE', tape });
}

export function VhsPlayerContent({ tape, inventory = [tape], onSelectTape, language, reducedDistortion, muted, onClueDetected, onEvidenceCaptured, onClose }: VhsPlayerProps) {
  const strings = getPlayerStrings(language);
  const [state, dispatch] = useReducer(transportReducer, tape, createLoadedState);
  const [notice, setNotice] = useState<NoticeKind | null>(null);
  const [inserted, setInserted] = useState(false);
  const [ejecting, setEjecting] = useState(false);

  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const reducedRef = useRef(reducedDistortion);
  const previousStateRef = useRef(state);
  const previousModeRef = useRef(state.mode);
  const audioRef = useRef<VhsAudio | null>(null);

  const params = computeVisualParams(state, reducedDistortion);
  const subtitle = subtitleAt(tape.id, state.position, language);
  const moving = state.mode === 'playing' || state.mode === 'rewind' || state.mode === 'ffwd';
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
    dispatch({ type: 'LOAD_TAPE', tape });
  }, [tape]);

  useEffect(() => {
    setInserted(false);
    audioRef.current?.insert();
    const timer = window.setTimeout(() => setInserted(true), 1300);
    return () => window.clearTimeout(timer);
  }, [tape.id]);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  useEffect(() => {
    const audio = createVhsAudio();
    audioRef.current = audio;
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

  useEffect(() => {
    const found = newDetections(previousStateRef.current, state);
    previousStateRef.current = state;
    for (const detection of found) {
      onClueDetected(detection);
      try {
        const image = canvasRef.current?.toDataURL('image/png');
        if (image) onEvidenceCaptured?.(detection, image);
      } catch {
        // Evidence capture is optional and cannot interrupt the story.
      }
      setNotice(detection.tapeId === MEMORY_ID && detection.clueId === PERFECT_TRACKING_CLUE_ID ? 'perfect' : 'clue');
    }
  }, [state, onClueDetected]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice]);

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
          context.fillText(strings.screenLabel, 18, 28);
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

  function run(actions: TransportAction[]): void {
    for (const action of actions) dispatch(action);
  }

  function togglePlayback(): void {
    if (!inserted) return;
    dispatch({ type: moving ? 'PAUSE' : 'PLAY' });
  }

  function eject(): void {
    if (ejecting) return;
    setEjecting(true);
    window.setTimeout(onClose, 500);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>): void {
    wakeAudio();
    const { target } = event;
    if (target instanceof HTMLButtonElement && (event.key === ' ' || event.key === 'Enter')) return;
    if (target instanceof HTMLInputElement && event.key.startsWith('Arrow')) return;
    const command = commandForKey(event, state.mode);
    if (!command) return;
    event.preventDefault();
    if (!inserted && command.actions.some((action) => action.type === 'PLAY')) return;
    run(command.actions);
    if (command.close) onClose();
  }

  const atmosphereClass = `vhs-player--${params.atmosphere}`;
  const rootClass = ['vhs-player', atmosphereClass, reducedDistortion ? 'vhs-player--reduced' : ''].filter(Boolean).join(' ');

  return (
    <section ref={rootRef} className={rootClass} aria-label={strings.region} translate="no" tabIndex={-1} onKeyDown={handleKeyDown} onPointerDown={wakeAudio}>
      <nav className="vhs-inventory" aria-label="VHS inventory">
        {inventory.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === tape.id ? 'vhs-inventory__tab vhs-inventory__tab--active' : 'vhs-inventory__tab'}
            aria-current={item.id === tape.id ? 'true' : undefined}
            onClick={() => onSelectTape?.(item)}
          >
            {item.id === MEMORY_ID ? 'Archive 09' : item.title}
          </button>
        ))}
      </nav>
      <div className="vhs-tv">
        <div className="vhs-screen" role="img" aria-label={strings.screenLabel}>
          <canvas ref={canvasRef} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} />
          <div className="vhs-tint" aria-hidden="true" />
          <div className="vhs-scanlines" aria-hidden="true" />
          <div className="vhs-osd" aria-hidden="true">
            <span className="vhs-osd__mode">{strings.modes[state.mode]}</span>
            <span className="vhs-osd__time">{formatTimecode(state.position)}</span>
          </div>
          {notice && (
            <div className={`vhs-notice vhs-notice--${notice}`} role="status">
              {notice === 'perfect' ? strings.perfectTracking : strings.clueRecorded}
            </div>
          )}
        </div>
      </div>
      <div className={`vhs-deck${ejecting ? ' vhs-deck--ejecting' : ''}`} aria-label="VCR deck">
        <div className="vhs-deck__slot" aria-hidden="true">
          <div className="vhs-deck__cassette">
            <span className="vhs-deck__reel" />
            <strong>{tape.id === MEMORY_ID ? 'ARCHIVE 09' : "MIDNIGHT RENTALS '97"}</strong>
            <span className="vhs-deck__reel" />
          </div>
        </div>
        <span className={`vhs-deck__led${moving ? ' vhs-deck__led--play' : ''}`} aria-hidden="true">{moving ? 'PLAY' : 'READY'}</span>
        {!inserted && <div className="vhs-insert-overlay"><div className="vhs-insert-cassette" aria-hidden="true"><span /><span /></div><strong>{strings.inserting}</strong></div>}
      </div>
      <p className="vhs-subtitle" lang={language}>{subtitle ?? '\u00a0'}</p>

      <div className="vhs-timeline">
        <div className="vhs-timeline__track">
          {anomalyZones.map((zone) => (
            <span
              key={zone.key}
              className="vhs-timeline__zone"
              title={strings.timelineAnomaly}
              style={{ left: `${zone.left}%`, width: `${zone.width}%` }}
            />
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

      <div className="vhs-meters">
        <label className="vhs-meter">
          <span>
            {strings.trackingLabel} <strong>{Math.round(state.tracking)}%</strong>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={state.tracking}
            aria-label={strings.trackingSlider}
            onChange={(event) => dispatch({ type: 'SET_TRACKING', value: Number(event.currentTarget.value) })}
          />
        </label>
        <div className="vhs-meter">
          <span>
            {strings.signalLabel} <strong>{Math.round(state.signalQuality * 100)}%</strong>
          </span>
          <div className="vhs-signal" aria-hidden="true">
            <div className="vhs-signal__fill" style={{ width: `${state.signalQuality * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="vhs-controls vhs-controls--minimal">
        <button type="button" className="vhs-controls__main" disabled={!inserted} onClick={togglePlayback}>
          {moving ? `\u275a\u275a ${strings.pause}` : `\u25b6 ${strings.play}`}
        </button>
        <button type="button" className="vhs-secondary" onClick={eject}>
          {strings.close}
        </button>
      </div>
    </section>
  );
}
