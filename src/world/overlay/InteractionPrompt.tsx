import type { StationId } from '../../core/contracts';

export const PROMPT_TEXT: Readonly<Record<StationId, string>> = {
  vhs: 'Press E to inspect the CRT television',
  arcade: 'Press E to use the arcade cabinet',
};

export interface InteractionPromptProps {
  /** Station currently targeted, or null/undefined when none. */
  target?: StationId | null;
}

/** The live region is always in the DOM; only its text changes. */
export function InteractionPrompt({ target }: InteractionPromptProps) {
  const text = target ? PROMPT_TEXT[target] : '';
  return (
    <div className="world-prompt-region" role="status" aria-live="polite" aria-atomic="true">
      {text ? <span className="world-chip world-prompt">{text}</span> : null}
    </div>
  );
}
