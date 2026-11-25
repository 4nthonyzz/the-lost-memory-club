import { useId } from 'react';
import './ui.css';
import type { Language, Preferences } from './preferences';
import { getUiStrings } from './strings';

export interface AccessibilitySettingsProps {
  preferences: Preferences;
  onChange: (patch: Partial<Preferences>) => void;
}

const LANGUAGES: readonly Language[] = ['en', 'es'];

export function AccessibilitySettings({ preferences, onChange }: AccessibilitySettingsProps) {
  const groupName = useId();
  const strings = getUiStrings(preferences.language).settings;
  const labels: Record<Language, string> = { en: strings.english, es: strings.spanish };

  return (
    <fieldset className="settings">
      <legend>{strings.title}</legend>

      <div className="settings__row" role="radiogroup" aria-label={strings.language}>
        <span className="settings__label">{strings.language}</span>
        {LANGUAGES.map((language) => (
          <label key={language} className={`settings__choice${preferences.language === language ? ' settings__choice--active' : ''}`}>
            <input
              type="radio"
              name={groupName}
              value={language}
              checked={preferences.language === language}
              onChange={() => onChange({ language })}
            />
            <span lang={language}>{labels[language]}</span>
          </label>
        ))}
      </div>

      <label className="settings__row settings__toggle">
        <input type="checkbox" checked={preferences.reducedDistortion} onChange={(event) => onChange({ reducedDistortion: event.currentTarget.checked })} />
        <span>
          {strings.reducedDistortion}
          <small>{strings.reducedDistortionHint}</small>
        </span>
      </label>

      <label className="settings__row settings__toggle">
        <input type="checkbox" checked={preferences.muted} onChange={(event) => onChange({ muted: event.currentTarget.checked })} />
        <span>{strings.mute}</span>
      </label>
    </fieldset>
  );
}
