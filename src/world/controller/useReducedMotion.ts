import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

type MediaListener = (event: { matches: boolean }) => void;

interface MediaQueryLike {
  matches: boolean;
  addEventListener?: (type: 'change', listener: MediaListener) => void;
  removeEventListener?: (type: 'change', listener: MediaListener) => void;
  addListener?: (listener: MediaListener) => void;
  removeListener?: (listener: MediaListener) => void;
}

interface WindowLike {
  matchMedia?: (query: string) => MediaQueryLike;
}

function getQuery(win: WindowLike | undefined): MediaQueryLike | null {
  if (!win || typeof win.matchMedia !== 'function') return null;
  try {
    return win.matchMedia(QUERY) ?? null;
  } catch {
    return null;
  }
}

/** Reads the OS reduced-motion preference. A missing matchMedia means no preference. */
export function readReducedMotion(win: WindowLike | undefined): boolean {
  return getQuery(win)?.matches === true;
}

/**
 * Returns true when the OS prefers reduced motion or `override` is true.
 * Updates on preference changes without remounting.
 */
export function useReducedMotion(override = false): boolean {
  const win = typeof window === 'undefined' ? undefined : window;
  const [preference, setPreference] = useState<boolean>(() => readReducedMotion(win));

  useEffect(() => {
    const query = getQuery(win);
    if (!query) {
      setPreference(false);
      return undefined;
    }
    const onChange: MediaListener = (event) => setPreference(event.matches === true);
    setPreference(query.matches === true);
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', onChange);
      return () => query.removeEventListener?.('change', onChange);
    }
    query.addListener?.(onChange);
    return () => query.removeListener?.(onChange);
  }, [win]);

  return override || preference;
}
