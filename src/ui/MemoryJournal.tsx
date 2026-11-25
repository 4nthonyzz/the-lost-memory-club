import { useId } from 'react';
import './ui.css';
import type { Language } from './preferences';
import { getUiStrings } from './strings';
import type { AtmosphereView, JournalEntryView } from './viewModels';

export interface MemoryJournalProps {
  language: Language;
  entries: readonly JournalEntryView[];
  totalEntries: number;
  atmosphere: AtmosphereView;
  onClose?: () => void;
}

export function MemoryJournal({ language, entries, totalEntries, atmosphere, onClose }: MemoryJournalProps) {
  const strings = getUiStrings(language).journal;
  const titleId = useId();
  const undeveloped = Math.max(0, totalEntries - entries.length);
  const corruption = Math.round(Math.min(1, Math.max(0, atmosphere.distortion)) * 100);

  return (
    <section className="journal" aria-labelledby={titleId} lang={language}>
      <header className="journal__header">
        <div>
          <p className="journal__eyebrow">{strings.subtitle}</p>
          <h2 id={titleId}>{strings.title}</h2>
          <p className="journal__progress">{strings.progress(entries.length, totalEntries)}</p>
        </div>
        {onClose && (
          <button type="button" className="journal__close" onClick={onClose}>
            {strings.close}
          </button>
        )}
      </header>

      <div className="journal__atmosphere">
        <p className="journal__eyebrow">
          {`${strings.atmosphereHeading} \u00b7 ${atmosphere.stageLabel}`}
        </p>
        <p className="journal__headline">{atmosphere.headline}</p>
        <ul className="journal__whispers">
          {atmosphere.whispers.map((whisper) => (
            <li key={whisper}>{whisper}</li>
          ))}
        </ul>
        <p className="journal__objective">
          <strong>{strings.objectiveLabel}:</strong> {atmosphere.nextObjective}
        </p>
        <div className="journal__corruption" role="img" aria-label={`${strings.corruptionLabel}: ${corruption}%`}>
          <span>{strings.corruptionLabel}</span>
          <div className="journal__corruption-track">
            <div className="journal__corruption-fill" style={{ width: `${corruption}%` }} />
          </div>
        </div>
      </div>

      {entries.length === 0 && <p className="journal__empty">{strings.empty}</p>}

      <ol className="journal__grid">
        {entries.map((entry) => (
          <li key={entry.id} className={`journal-card journal-card--${entry.kind}`}>
            <span className="journal-card__kind">{strings.kinds[entry.kind]}</span>
            <div className="journal-card__photo" aria-hidden="true" />
            <h3>{entry.title}</h3>
            <p className="journal-card__caption">{entry.caption}</p>
            <p className="journal-card__text">{entry.text}</p>
          </li>
        ))}
        {Array.from({ length: undeveloped }, (_, index) => (
          <li key={`undeveloped-${index}`} className="journal-card journal-card--blank">
            <div className="journal-card__photo" aria-hidden="true" />
            <p className="journal-card__caption">{strings.undeveloped}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
