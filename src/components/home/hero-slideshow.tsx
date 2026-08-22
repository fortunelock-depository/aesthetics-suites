// src/components/home/hero-slideshow.tsx
import type { CSSProperties } from 'react';
import Image from 'next/image';
import { HERO } from '@/static-data/home';

/**
 * The hero backdrop: four stills cross-dissolving under a slow Ken Burns
 * drift. This is the treatment high-end hospitality sites use - atmosphere
 * and immersion, no arrows, dots or counters - rather than a slider that
 * announces itself.
 *
 * Pure CSS: the timeline is staggered keyframe delays (see globals.css), so
 * the hero stays a Server Component, ships no JavaScript for the effect and
 * has no hydration step to wait for. A timer in a client component would
 * have meant shipping JS to animate something the compositor can run alone.
 *
 * Decorative by intent: the headline carries the meaning, so the stage is
 * aria-hidden and every still has an empty alt. Because it is hidden, the
 * play/pause control cannot live in here: it sits in the hero and addresses
 * the stage by `id`, flipping the `data-paused` hook the stylesheet reads.
 */
export function HeroSlideshow({ id }: { id: string }) {
  return (
    <div id={id} aria-hidden className="kk-hero-stage">
      {HERO.images.map((image, index) => (
        <div
          key={image.src}
          className="kk-hero-slide"
          // Drives both the dissolve and the drift delay, so a slide's
          // motion and its visibility stay phase-locked.
          style={{ '--kk-hero-i': index } as CSSProperties}
        >
          <div className="kk-hero-drift">
            <Image
              src={image}
              alt=""
              fill
              sizes="100vw"
              placeholder="blur"
              className="object-cover"
              // Only the first still is the LCP candidate. The others are
              // not seen for seven seconds, so they must not compete for
              // bandwidth with the paint that decides the score.
              priority={index === 0}
              fetchPriority={index === 0 ? 'high' : 'low'}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
