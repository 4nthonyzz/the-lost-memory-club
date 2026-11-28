import { useEffect, useRef } from 'react';
import './ui.css';
import { createActionAudio, type ActionCue } from '../memories/audio/actionAudio';
import { getFlowStrings } from './flowStrings';
import type { Language } from './preferences';

export type ActionCutsceneKind = 'insert-tape' | 'clue-to-arcade' | 'insert-coin';

export interface ActionCutsceneProps {
  kind: ActionCutsceneKind;
  language: Language;
  reducedDistortion: boolean;
  muted?: boolean;
  /** Test and low-power builds can complete the transition without waiting 1.1 s. */
  skipAnimation?: boolean;
  label?: string;
  machine?: string;
  onDone: () => void;
}

const CUE_BY_KIND: Record<ActionCutsceneKind, ActionCue> = {
  'insert-tape': 'clunk',
  'clue-to-arcade': 'polaroid',
  'insert-coin': 'coin',
};

const DURATION_MS = 1100;

/** A short, skippable analog-media action. It is an overlay, not a world dependency. */
export function ActionCutscene({ kind, language, reducedDistortion, muted = false, skipAnimation = false, label, machine = '', onDone }: ActionCutsceneProps) {
  const strings = getFlowStrings(language);
  const doneRef = useRef(onDone);
  const audioRef = useRef<ReturnType<typeof createActionAudio> | null>(null);
  doneRef.current = onDone;

  useEffect(() => {
    if (reducedDistortion || skipAnimation) {
      doneRef.current();
      return undefined;
    }
    audioRef.current = createActionAudio();
    if (!muted) audioRef.current.play(CUE_BY_KIND[kind]);
    const id = window.setTimeout(() => doneRef.current(), DURATION_MS);
    return () => {
      window.clearTimeout(id);
      audioRef.current?.close();
      audioRef.current = null;
    };
  }, [kind, muted, reducedDistortion, skipAnimation]);

  if (reducedDistortion || skipAnimation) return null;

  const heading = kind === 'insert-tape'
    ? strings.action.insertTape
    : kind === 'insert-coin'
      ? strings.action.insertCoin(machine)
      : strings.action.clueToArcade(machine);

  return (
    <div className={`action-cutscene action-cutscene--${kind}`} role="status" aria-live="polite" lang={language}>
      <div className="action-cutscene__crt" aria-hidden="true">
        <div className="action-cutscene__screen">
          {kind === 'insert-tape' && <div className="action-cutscene__hand action-cutscene__hand--tape"><span>{label}</span></div>}
          {kind === 'clue-to-arcade' && (
            <>
              <div className="action-cutscene__arcade-preview"><span>{machine}</span><i /></div>
              <div className="action-cutscene__polaroid"><span>★</span><small>{machine}</small></div>
            </>
          )}
          {kind === 'insert-coin' && <div className="action-cutscene__hand action-cutscene__hand--coin"><span>◉</span></div>}
          <span className="action-cutscene__led">PLAY</span>
        </div>
      </div>
      <p className="action-cutscene__heading" translate="no">{heading}</p>
      <button type="button" className="action-cutscene__skip" onClick={() => doneRef.current()}>
        {strings.action.skip}
      </button>
    </div>
  );
}

export { DURATION_MS as ACTION_CUTSCENE_MS };
