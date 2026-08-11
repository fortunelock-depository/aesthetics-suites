// src/components/site/arc-ring.tsx
'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * The orbiting arc used by the play medallions and the social icons: an
 * SVG stroke covering ~30% of the circle whose color fades out toward BOTH
 * ends (a "closing flame" - stretched, softened tips, never a hard cut).
 * The caller animates it via className (continuous `play-arc` rotation or
 * the socials' hover `spin-once`).
 */
export function ArcRing({
  className,
  color = '#ffffff',
  strokeWidth = 2,
}: {
  className?: string;
  /** The arc's peak color (fades to transparent at the tips). */
  color?: string;
  strokeWidth?: number;
}) {
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full [transform-origin:center]',
        className,
      )}
    >
      <defs>
        {/* Horizontal fade: the arc sits across the top of the circle, so
            its two tips land at the gradient's transparent extremes. */}
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="30%" stopColor={color} stopOpacity="0.85" />
          <stop offset="50%" stopColor={color} stopOpacity="1" />
          <stop offset="70%" stopColor={color} stopOpacity="0.85" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle
        cx="50"
        cy="50"
        r="49"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="30 70"
        // Center the arc over the top of the circle.
        strokeDashoffset={40}
      />
    </svg>
  );
}
