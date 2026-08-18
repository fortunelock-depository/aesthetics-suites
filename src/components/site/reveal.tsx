// src/components/site/reveal.tsx
'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger offset in seconds (e.g. index * 0.1 for card grids). */
  delay?: number;
  /** Slide-in direction; 'none' fades only. */
  from?: 'up' | 'left' | 'right' | 'none';
}

const OFFSET = 28;

/**
 * Scroll-reveal wrapper (the animate.css/waypoints equivalent from the
 * reference template, done with motion/react): children fade/slide in once
 * when they enter the viewport. Respects prefers-reduced-motion by
 * rendering statically.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  from = 'up',
}: RevealProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const horizontal = from === 'left' || from === 'right';
  const hidden = {
    opacity: 0,
    x: from === 'left' ? -OFFSET : from === 'right' ? OFFSET : 0,
    y: from === 'up' ? OFFSET : 0,
  };

  const inner = (
    <motion.div
      className={horizontal ? undefined : className}
      initial={hidden}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );

  // A horizontal slide parks its child translated 28px sideways until it
  // scrolls into view. Below the fold, a full-width block shifted right
  // therefore widens the document by 28px, and the page scrolls sideways
  // while the visitor is still looking at the hero (the Welcome collage on
  // phones did exactly this). Clip the x axis on a static wrapper so the
  // parked transform can never contribute scrollable overflow; y stays
  // visible, so nothing that intentionally hangs below (offset frames,
  // shadows) is cut.
  if (!horizontal) return inner;
  return <div className={cn('overflow-x-clip', className)}>{inner}</div>;
}
