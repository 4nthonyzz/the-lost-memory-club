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
}

function promptFor(target: StationId | InteractionTarget | null | undefined, lampOn: Readonly<Record<LampId, boolean>>): string {
  if (!target) return '';
  if (typeof target === 'string') return PROMPT_TEXT[target];
  if (target.type === 'station') return PROMPT_TEXT[target.station.id];
  return propPromptText(target.prop.id, lampOn);
}

/** The live region is always in the DOM; only its text changes. */
export function InteractionPrompt({ target, lampOn = LAMPS_ON }: InteractionPromptProps) {
  const text = promptFor(target, lampOn);
  return (
    <div className="world-prompt-region" role="status" aria-live="polite" aria-atomic="true">
      {text ? <span className="world-chip world-prompt">{text}</span> : null}
    </div>
  );
}
