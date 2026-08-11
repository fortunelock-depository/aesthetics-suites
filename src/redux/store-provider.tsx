// src/redux/store-provider.tsx
'use client';

import { useState } from 'react';
import { Provider } from 'react-redux';
import { makeStore } from './store';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer: the store is created exactly once per client, and it's
  // safe to read during render (unlike a useRef, per react-hooks/refs).
  const [store] = useState(makeStore);

  return <Provider store={store}>{children}</Provider>;
}
