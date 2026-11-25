import { ARCHIVE_DOCUMENTS, ARCHIVE_FOOTER_HINT } from '../logic/archiveDocuments';
import type { ReadableId } from '../worldTypes';

export interface WorldInspectorCardProps {
  /** The readable prop whose card is open, or null/undefined when no card is open. */
  id?: ReadableId | null;
}

/**
 * Archive Document Card. A non-modal, non-interactive paper document shown inside the world wrapper. It is not a
 * dialog: there is no focus trap, no focus move and no pointer events. It closes on E, Esc or by walking away.
 */
export function WorldInspectorCard({ id = null }: WorldInspectorCardProps) {
  if (id === null) return null;
  const doc = ARCHIVE_DOCUMENTS[id];
  return (
    <div className="world-card-region">
      <section className="world-card" role="region" aria-label={doc.title} aria-live="polite" data-card-id={doc.id}>
        <p className="world-card-tag">{doc.tag}</p>
        <h2 className="world-card-title">{doc.title}</h2>
        {doc.paragraphs.map((text) => (
          <p className="world-card-body" key={text}>
            {text}
          </p>
        ))}
        {doc.statusLine ? <p className="world-card-status">{doc.statusLine}</p> : null}
        <p className="world-card-footer">{ARCHIVE_FOOTER_HINT}</p>
      </section>
    </div>
  );
}
