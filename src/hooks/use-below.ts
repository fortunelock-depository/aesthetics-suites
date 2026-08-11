// src/hooks/use-below.ts
//
// Viewport-threshold hooks for chrome that switches primitives by screen
// size (dialog vs full sheet). useSyncExternalStore instead of the dms
// setState-in-effect version, which fails our lint.
'use client';

import * as React from 'react';

const LG_BREAKPOINT = 1024;
const MD_BREAKPOINT = 768;

function useIsBelow(maxWidth: number): boolean {
  const query = `(max-width: ${maxWidth - 1}px)`;

  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );

  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Below md (tablet portrait) a form dialog expands into a full sheet. */
export function useIsBelowMd(): boolean {
  return useIsBelow(MD_BREAKPOINT);
}

/** For tall forms that fill a tablet too. */
export function useIsBelowLg(): boolean {
  return useIsBelow(LG_BREAKPOINT);
}
