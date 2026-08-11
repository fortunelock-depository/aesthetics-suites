// src/components/theme-toggle.tsx
'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  iconClassName?: string;
}

const subscribe = () => () => {};

/**
 * Resolves to `true` only after hydration. The server and the first client
 * render both read the `false` snapshot, so they always match; React then
 * re-renders with `true` once mounted. Avoids a setState-in-effect mount flag.
 */
function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/**
 * Theme switch button. next-themes can resolve the theme during the first
 * client render (from its injected script), so we gate the icon behind a
 * hydration-safe mount flag - the server and first client render both emit
 * the placeholder, guaranteeing they match before the icon swaps in.
 */
export function ThemeToggle({ className, iconClassName }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const themeReady = useMounted();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-colors cursor-pointer',
        className,
      )}
    >
      {themeReady ? (
        isDark ? (
          <Sun className={cn('h-5 w-5', iconClassName)} />
        ) : (
          <Moon className={cn('h-5 w-5', iconClassName)} />
        )
      ) : (
        <span className={cn('block h-5 w-5', iconClassName)} />
      )}
    </button>
  );
}
