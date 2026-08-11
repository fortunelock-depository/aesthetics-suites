// src/hooks/use-debounced-value.ts
'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `value` after it has stayed unchanged for `delayMs`. Use for search
 * inputs so a query fires once per pause, not once per keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
