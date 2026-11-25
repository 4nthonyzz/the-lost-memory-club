import './ui.css';
import type { Language } from './preferences';
import { getUiStrings, type SaveStatus } from './strings';

export interface SaveIndicatorProps {
  status: SaveStatus;
  language: Language;
}

export function SaveIndicator({ status, language }: SaveIndicatorProps) {
  return (
    <span className={`save-indicator save-indicator--${status}`} role="status" aria-live="polite">
      <span className="save-indicator__dot" aria-hidden="true" />
      {getUiStrings(language).save[status]}
    </span>
  );
}
