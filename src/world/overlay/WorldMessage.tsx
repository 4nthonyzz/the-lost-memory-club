import type { WorldMessage as WorldMessageData } from '../logic/propState';

export interface WorldMessageProps {
  /** Current world message, or null/undefined when none. */
  message?: WorldMessageData | null;
}

/**
 * Message from a world-local prop (lamp or manual). It sits just above the interaction prompt, inside the
 * world wrapper, so it never covers the App status line. The live region is always in the DOM.
 */
export function WorldMessage({ message }: WorldMessageProps) {
  return (
    <div className="world-message-region" role="status" aria-live="polite" aria-atomic="true">
      {message ? <span className="world-chip world-message">{message.text}</span> : null}
    </div>
  );
}
