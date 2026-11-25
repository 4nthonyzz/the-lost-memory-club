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
import { computeVisualParams, formatTimecode } from './vhsVisuals';
import './VhsPlayer.css';

export interface VhsPlayerProps {
  tape: TapeDefinition;
  language: Language;
  reducedDistortion: boolean;
  muted: boolean;
  onMutedChange?: (muted: boolean) => void;
  onClueDetected: (detection: ClueDetection) => void;
  onClose: () => void;
}

type NoticeKind = 'clue' | 'perfect';

const NOTICE_DURATION_MS = 4500;

function createLoadedState(tape: TapeDefinition): TransportState {
  return transportReducer(createTransportState(), { type: 'LOAD_TAPE', tape });
}

export function VhsPlayer({ tape, language, reducedDistortion, muted, onMutedChange, onClueDetected, onClose }: VhsPlayerProps) {
  const strings = getPlayerStrings(language);
  const [state, dispatch] = useReducer(transportReducer, tape, createLoadedState);
  const [notice, setNotice] = useState<NoticeKind | null>(null);

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

  useEffect(() => {
    stateRef.current = state;
    reducedRef.current = reducedDistortion;
  });

  useEffect(() => {
    dispatch({ type: 'LOAD_TAPE', tape });
  }, [tape]);

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
    audioRef.current?.update({
      mode: state.mode,
      signalQuality: state.signalQuality,
      tension: tensionLevel(params.reveal, state.mode),
      muted,
      reducedDistortion,
    });
  }, [state.mode, state.signalQuality, params.reveal, muted, reducedDistortion]);

  useEffect(() => {
    if (previousModeRef.current === state.mode) return;
    previousModeRef.current = state.mode;
    audioRef.current?.click();
  }, [state.mode]);

  useEffect(() => {
    const found = newDetections(previousStateRef.current, state);
    previousStateRef.current = state;
    for (const detection of found) {
      onClueDetected(detection);
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
    const renderer = createVhsRenderer(canvas);
    let frameId = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const seconds = Math.min(0.1, (now - last) / 1000);
      last = now;
      const current = stateRef.current;
      if (current.mode === 'playing' || current.mode === 'rewind' || current.mode === 'ffwd') {
        dispatch({ type: 'TICK', seconds });
      }
      renderer?.draw({
        tapeId: current.tape?.id ?? '',
        time: now / 1000,
        position: current.position,
        mode: current.mode,
        params: computeVisualParams(current, reducedRef.current),
      });
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  function wakeAudio(): void {
    void audioRef.current?.resume();
  }

  function run(actions: TransportAction[]): void {
    for (const action of actions) dispatch(action);
  }

  function stepFrame(direction: 1 | -1): void {
    if (state.mode === 'stopped') return;
    if (state.mode !== 'paused') dispatch({ type: 'PAUSE' });
    dispatch({ type: 'STEP_FRAME', direction });
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>): void {
    wakeAudio();
    const { target } = event;
    if (target instanceof HTMLButtonElement && (event.key === ' ' || event.key === 'Enter')) return;
    if (target instanceof HTMLInputElement && event.key.startsWith('Arrow')) return;
    const command = commandForKey(event, state.mode);
    if (!command) return;
    event.preventDefault();
    run(command.actions);
    if (command.close) onClose();
  }

  const atmosphereClass = `vhs-player--${params.atmosphere}`;
  const rootClass = ['vhs-player', atmosphereClass, reducedDistortion ? 'vhs-player--reduced' : ''].filter(Boolean).join(' ');

  return (
    <section ref={rootRef} className={rootClass} aria-label={strings.region} tabIndex={-1} onKeyDown={handleKeyDown} onPointerDown={wakeAudio}>
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
        <p className="vhs-subtitle" lang={language}>
          {subtitle ?? '\u00a0'}
        </p>
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

      <div className="vhs-controls">
        <button type="button" aria-label={strings.rewind} title={strings.rewind} onClick={() => dispatch({ type: 'REWIND' })}>
          {'\u25c0\u25c0'}
        </button>
        <button type="button" aria-label={strings.stepBack} title={strings.stepBack} onClick={() => stepFrame(-1)}>
          {'|\u25c0'}
        </button>
        <button
          type="button"
          className="vhs-controls__main"
          onClick={() => dispatch({ type: moving ? 'PAUSE' : 'PLAY' })}
        >
          {moving ? `\u275a\u275a ${strings.pause}` : `\u25b6 ${strings.play}`}
        </button>
        <button type="button" aria-label={strings.stepForward} title={strings.stepForward} onClick={() => stepFrame(1)}>
          {'\u25b6|'}
        </button>
        <button type="button" aria-label={strings.fastForward} title={strings.fastForward} onClick={() => dispatch({ type: 'FAST_FORWARD' })}>
          {'\u25b6\u25b6'}
        </button>
        <button type="button" aria-label={strings.stop} title={strings.stop} onClick={() => dispatch({ type: 'STOP' })}>
          {'\u25a0'}
        </button>
        <button type="button" aria-label={strings.trackingDown} title={strings.trackingDown} onClick={() => dispatch({ type: 'ADJUST_TRACKING', delta: -1 })}>
          {'TRK \u2212'}
        </button>
        <button type="button" aria-label={strings.trackingUp} title={strings.trackingUp} onClick={() => dispatch({ type: 'ADJUST_TRACKING', delta: 1 })}>
          {'TRK +'}
        </button>
      </div>

      <div className="vhs-footer">
        <p className="vhs-help">{strings.hint}</p>
        <p className="vhs-help vhs-help--keys">{strings.keyboardHelp}</p>
        <div className="vhs-footer__buttons">
          {onMutedChange && (
            <button type="button" className="vhs-secondary" aria-pressed={muted} onClick={() => onMutedChange(!muted)}>
              {muted ? strings.unmute : strings.mute}
            </button>
          )}
          <button type="button" className="vhs-secondary" onClick={onClose}>
            {strings.close}
          </button>
        </div>
      </div>
    </section>
  );
}
