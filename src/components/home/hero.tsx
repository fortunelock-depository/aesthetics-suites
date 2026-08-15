// src/components/home/hero.tsx
import { Reveal } from '@/components/site/reveal';
import { HERO } from '@/static-data/home';
import { PlayCircle } from '@/components/site/play-circle';
import { BookingBar } from './booking-bar';
import { HeroSlideshow } from './hero-slideshow';

/**
 * The landing hero: the reference template's composition (full-bleed
 * imagery, two-line staircase headline, booking bar riding the bottom
 * edge) re-toned light - ivory field, dark display type, gold accents.
 */
export function Hero() {
  return (
    <section aria-label="Welcome" className="relative">
      {/* Backdrop: cross-dissolving stills with a light scrim over them so
          the headline stays dark-on-light through every frame. */}
      <div className="absolute inset-0 -z-10">
        <HeroSlideshow />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(90deg,var(--background)_15%,color-mix(in_oklch,var(--background),transparent_35%)_55%,color-mix(in_oklch,var(--background),transparent_70%)_100%)]"
        />
      </div>

      <div className="mx-auto w-full max-w-[1320px] px-4 lg:px-3">
        <div className="flex min-h-[70vh] items-center justify-between gap-10 pt-36 pb-16 sm:pb-24 lg:min-h-[750px] lg:pt-[161px]">
          <Reveal>
            <p className="text-sm font-medium tracking-[0.2em] text-brand-text uppercase">
              {HERO.eyebrow}
            </p>
            {/* The template's staircase headline: line two steps inward. */}
            <h1 className="mt-4 font-heading text-[44px] leading-[1.2] font-bold text-foreground sm:text-6xl lg:text-[80px] lg:leading-[100px]">
              {HERO.titleLine1}
              <span className="block sm:pl-[12%]">{HERO.titleLine2}</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-[26px] text-muted-foreground sm:text-lg sm:leading-relaxed">
              {HERO.blurb}
            </p>
          </Reveal>

          {/* The template's animated play medallion, right of the headline. */}
          <Reveal delay={0.25} from="right" className="hidden md:block">
            <PlayCircle tone="dark" />
          </Reveal>
        </div>

        {/* Booking bar riding the hero's bottom edge. */}
        <Reveal delay={0.15} className="relative -mb-14 pb-0 sm:-mb-12">
          <BookingBar />
        </Reveal>
      </div>
    </section>
  );
}
