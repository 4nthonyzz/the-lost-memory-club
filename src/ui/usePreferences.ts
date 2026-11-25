import { useCallback, useEffect, useState } from 'react';
import { loadPreferences, savePreferences, type Preferences } from './preferences';

export function usePreferences(): [Preferences, (patch: Partial<Preferences>) => void] {
  const [preferences, setPreferences] = useState<Preferences>(loadPreferences);

  useEffect(() => {
    savePreferences(preferences);
    document.documentElement.lang = preferences.language;
  }, [preferences]);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPreferences((current) => ({ ...current, ...patch, version: 1 }));
  }, []);

  return [preferences, update];
}
