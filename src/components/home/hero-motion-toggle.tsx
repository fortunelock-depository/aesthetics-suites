// src/components/home/hero-motion-toggle.tsx
'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Pause, Play } from 'lucide-react';
import { useReducedMotion } from 'motion/react';

/** Remembers the choice, so a guest who stopped the hero stays stopped. */
const STORAGE_KEY = 'as-hero-motion';
const PAUSED = 'paused';
const PLAYING = 'playing';

/**
 * The choice lives outside React so it can be read straight from storage on
 * the first client render (a lazy state initialiser would disagree with the
 * server markup) and so a second tab making the same choice is picked up.
 * `null` means "not read yet"; storage throws in private mode and when site
 * data is blocked, in which case the choice is kept in memory for the visit.
 */
let pausedChoice: boolean | null = null;
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

function getSnapshot(): boolean {
  try {
    pausedChoice = window.localStorage.getItem(STORAGE_KEY) === PAUSED;
  } catch {
    pausedChoice ??= false;
  }
  return pausedChoice;
}

/** The hero plays until the visitor says otherwise, server-side included. */
function getServerSnapshot(): boolean {
  return false;
}

function setPausedChoice(next: boolean): void {
  pausedChoice = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? PAUSED : PLAYING);
  } catch {
    // Unwritable storage still leaves the choice applied to this visit.
  }
  for (const notify of listeners) notify();
}

/**
 * Play/pause for the hero backdrop: the slideshow runs far longer than five
 * seconds, so WCAG 2.2.2 requires a way to stop it. The stage is decorative
 * and aria-hidden, so this control sits outside it and drives the stage's
 * `data-paused` hook (globals.css) by id rather than owning the markup.
 *
 * Nothing renders for a visitor who prefers reduced motion: the stylesheet
 * already holds the first still, so there is no motion left to stop.
 */
export function HeroMotionToggle({ stageId }: { stageId: string }) {
  const reducedMotion = useReducedMotion();
  const paused = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const stage = document.getElementById(stageId);
    if (stage) stage.dataset.paused = String(paused);
  }, [paused, stageId]);

  if (reducedMotion) return null;

  return (
    <button
      type="button"
      onClick={() => setPausedChoice(!paused)}
      // Named for what the press will do, not for the current state.
      aria-label={
        paused
          ? 'Play the background slideshow'
          : 'Pause the background slideshow'
      }
      className="inline-flex h-9 w-9 items-center justify-center border border-border bg-card text-muted-foreground transition-colors hover:border-brand hover:text-brand"
    >
      {paused ? (
        <Play className="h-4 w-4" aria-hidden />
      ) : (
        <Pause className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
