// src/hooks/use-breakpoint.ts
'use client';

import { useSyncExternalStore } from 'react';

/**
 * Hydration-safe media-query hook: the server snapshot is `false`, so the
 * first client render always matches SSR, then the real value applies.
 */
function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Below Tailwind's `sm` (640px). */
export const useIsBelowSm = () => useMediaQuery('(max-width: 639.98px)');

/** Below Tailwind's `md` (768px). */
export const useIsBelowMd = () => useMediaQuery('(max-width: 767.98px)');

/** Below Tailwind's `lg` (1024px). */
export const useIsBelowLg = () => useMediaQuery('(max-width: 1023.98px)');
