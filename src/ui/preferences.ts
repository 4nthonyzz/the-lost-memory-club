export type Language = 'en' | 'es';

export const PREFERENCES_KEY = 'lost-memory-club.preferences.v1';

export interface Preferences {
  version: 1;
  language: Language;
  reducedDistortion: boolean;
  muted: boolean;
}

export function createDefaultPreferences(reducedDistortion = false): Preferences {
  return { version: 1, language: 'es', reducedDistortion, muted: false };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parsePreferences(raw: string | null, fallback: Preferences = createDefaultPreferences()): Preferences {
  if (!raw) return fallback;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1) return fallback;
    return {
      version: 1,
      language: value.language === 'en' || value.language === 'es' ? value.language : fallback.language,
      reducedDistortion: typeof value.reducedDistortion === 'boolean' ? value.reducedDistortion : fallback.reducedDistortion,
      muted: typeof value.muted === 'boolean' ? value.muted : fallback.muted,
    };
  } catch {
    return fallback;
  }
}

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function loadPreferences(): Preferences {
  const fallback = createDefaultPreferences(prefersReducedMotion());
  try {
    return parsePreferences(window.localStorage.getItem(PREFERENCES_KEY), fallback);
  } catch {
    return fallback;
  }
}

export function savePreferences(preferences: Preferences): boolean {
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
