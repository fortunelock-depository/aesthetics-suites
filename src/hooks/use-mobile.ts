// src/hooks/use-mobile.ts
//
// Back-compat alias: the shadcn sidebar scaffold shipped this hook, but it
// is byte-for-byte the same media-query subscription as use-breakpoint's
// useIsBelowMd - one implementation, re-exported under the old name.
'use client';

export { useIsBelowMd as useIsMobile } from './use-breakpoint';
