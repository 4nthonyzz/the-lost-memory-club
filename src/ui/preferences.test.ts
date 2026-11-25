import { describe, expect, it } from 'vitest';
import { createDefaultPreferences, loadPreferences, parsePreferences, PREFERENCES_KEY, savePreferences } from './preferences';
import { getUiStrings } from './strings';

describe('preferences', () => {
  it('defaults to English with effects and audio enabled', () => {
    expect(createDefaultPreferences()).toEqual({ version: 1, language: 'en', reducedDistortion: false, muted: false });
  });

  it('uses its own versioned key', () => {
    expect(PREFERENCES_KEY).toBe('lost-memory-club.preferences.v1');
  });

  it('round-trips a valid save', () => {
    const saved = { version: 1, language: 'es', reducedDistortion: true, muted: true };
    expect(parsePreferences(JSON.stringify(saved))).toEqual(saved);
  });

  it('falls back to defaults for missing, malformed or unsupported data', () => {
    const defaults = createDefaultPreferences();
    expect(parsePreferences(null)).toEqual(defaults);
    expect(parsePreferences('{broken')).toEqual(defaults);
    expect(parsePreferences('42')).toEqual(defaults);
    expect(parsePreferences('[]')).toEqual(defaults);
    expect(parsePreferences(JSON.stringify({ version: 2, language: 'es' }))).toEqual(defaults);
  });

  it('repairs invalid fields individually', () => {
    const result = parsePreferences(JSON.stringify({ version: 1, language: 'fr', reducedDistortion: 'yes', muted: true }));
    expect(result).toEqual({ version: 1, language: 'en', reducedDistortion: false, muted: true });
  });

  it('keeps a provided fallback for invalid fields', () => {
    const fallback = createDefaultPreferences(true);
    expect(parsePreferences('{broken', fallback).reducedDistortion).toBe(true);
    expect(parsePreferences(JSON.stringify({ version: 1, language: 'es' }), fallback).reducedDistortion).toBe(true);
  });

  it('survives environments without LocalStorage', () => {
    expect(loadPreferences()).toEqual(createDefaultPreferences());
    expect(savePreferences(createDefaultPreferences())).toBe(false);
  });
});

describe('interface strings', () => {
  it('provides non-empty copy for every key in both languages', () => {
    for (const language of ['en', 'es'] as const) {
      const strings = getUiStrings(language);
      const values = [
        ...Object.values(strings.journal.kinds),
        ...Object.values(strings.save),
        ...Object.values(strings.settings),
        ...Object.values(strings.endings),
        ...Object.values(strings.shell.notices),
        ...Object.values(strings.shell.progress),
        ...Object.values(strings.shell.deck),
        strings.shell.title,
        strings.shell.next.text,
        strings.journal.title,
        strings.journal.progress(1, 8),
      ];
      for (const value of values) expect(value.length).toBeGreaterThan(0);
    }
  });

  it('translates the key labels', () => {
    expect(getUiStrings('en').journal.title).toBe('Memory Journal');
    expect(getUiStrings('es').journal.title).toBe('Diario de recuerdos');
    expect(getUiStrings('es').save.saving).not.toBe(getUiStrings('en').save.saving);
  });
});
