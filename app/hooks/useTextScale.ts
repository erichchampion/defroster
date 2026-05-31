'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Accessibility text-size control. Persists the chosen scale to localStorage and
 * applies it to `--text-scale` on the document root; every font size in the
 * design system multiplies by this variable (see globals.css).
 */
export const TEXT_SCALE_STEPS = [1, 1.15, 1.32] as const;
const STORAGE_KEY = 'defroster-text-scale';

export function useTextScale() {
  const [scale, setScaleState] = useState<number>(1);

  // Restore persisted scale on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = parseFloat(window.localStorage.getItem(STORAGE_KEY) || '');
    if (stored && (TEXT_SCALE_STEPS as readonly number[]).includes(stored)) {
      setScaleState(stored);
    }
  }, []);

  // Apply to the document root whenever it changes.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--text-scale', String(scale));
  }, [scale]);

  const setScale = useCallback((next: number) => {
    setScaleState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    }
  }, []);

  return { scale, setScale };
}
