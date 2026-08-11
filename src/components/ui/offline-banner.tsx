// src/components/ui/offline-banner.tsx
'use client';

import { useEffect, useState } from 'react';

/**
 * Dark banner shown while the browser is offline. Mount once near the top of
 * a layout. `forceVisible` is for previews/tests.
 */
export function OfflineBanner({ forceVisible }: { forceVisible?: boolean }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (!(forceVisible ?? offline)) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-background"
    >
      <span
        className="h-2 w-2 flex-none rounded-full bg-brand"
        aria-hidden="true"
      />
      <span className="flex-1 text-sm">
        You&rsquo;re offline - showing saved data. We&rsquo;ll reconnect
        automatically.
      </span>
    </div>
  );
}
