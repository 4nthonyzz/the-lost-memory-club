import { READABLE_COUNT } from '../logic/archiveDocuments';

export interface NotesCounterProps {
  /** Distinct readable props read this session. */
  read: number;
  total?: number;
}

/**
 * Compact "NOTES READ: X / 7" (the total comes from the document count) pill in the bottom-right corner of the world overlay. It is not a live region: the
 * Archive Document Card and the prompt already announce the interaction, so this one carries only a label.
 */
export function NotesCounter({ read, total = READABLE_COUNT }: NotesCounterProps) {
  return (
    <div className="world-notes" role="group" aria-label={`Notes read: ${read} of ${total}`}>
      <span className="world-chip">{`NOTES READ: ${read} / ${total}`}</span>
    </div>
  );
}
