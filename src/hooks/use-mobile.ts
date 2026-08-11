// src/hooks/use-mobile.ts
'use client';

import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

/**
 * Below-md detection for the sidebar's sheet/inline switch. Hydration-safe:
 * the server snapshot is `false`, so the first client render always matches
 * SSR, then the real value applies (no setState-in-effect).
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(QUERY);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
