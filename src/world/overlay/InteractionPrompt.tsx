import type { StationId } from '../../core/contracts';
import { propPromptText } from '../logic/propState';
import type { InteractionTarget, LampId } from '../worldTypes';

export const PROMPT_TEXT: Readonly<Record<StationId, string>> = {
  vhs: 'Press E to inspect the CRT television',
  arcade: 'Press E to use the arcade cabinet',
};

const LAMPS_ON: Readonly<Record<LampId, boolean>> = { 'desk-lamp-left': true, 'desk-lamp-right': true };

export interface InteractionPromptProps {
  /** Station id or combined target currently targeted, or null/undefined when none. */
  target?: StationId | InteractionTarget | null;
  /** Lamp states, used for the lamp prompt text. Absent means both lamps are on. */
  lampOn?: Readonly<Record<LampId, boolean>>;
  /** MUSIC_CATALOG index of the track that is playing, or null/absent when none is. Used by the turntable prompt. */
  playingTrack?: number | null;
}

function promptFor(target: StationId | InteractionTarget | null | undefined, lampOn: Readonly<Record<LampId, boolean>>, playingTrack: number | null): string {
  if (!target) return '';
  if (typeof target === 'string') return PROMPT_TEXT[target];
  if (target.type === 'station') return PROMPT_TEXT[target.station.id];
  return propPromptText(target.prop.id, lampOn, playingTrack);
}

/** The live region is always in the DOM; only its text changes. */
export function InteractionPrompt({ target, lampOn = LAMPS_ON, playingTrack = null }: InteractionPromptProps) {
  const text = promptFor(target, lampOn, playingTrack);
  return (
    <div className="world-prompt-region" role="status" aria-live="polite" aria-atomic="true">
      {text ? <span className="world-chip world-prompt">{text}</span> : null}
    </div>
  );
}
