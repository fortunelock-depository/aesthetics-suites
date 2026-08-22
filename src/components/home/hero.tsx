// src/components/home/hero.tsx
import { Reveal } from '@/components/site/reveal';
import { EYEBROW } from '@/components/site/section-heading';
import { HERO } from '@/static-data/home';
import { BookingBar } from './booking-bar';
import { HeroSlideshow } from './hero-slideshow';
import { HeroMotionToggle } from './hero-motion-toggle';

/** Ties the pause control to the (aria-hidden) slideshow stage it drives. */
const HERO_STAGE_ID = 'hero-slideshow';

/**
 * The landing hero: full-bleed imagery, a two-line staircase headline and
 * the booking bar riding the bottom edge, toned light - ivory field, dark
 * display type, clay accents.
 */
export function Hero() {
  return (
    <section aria-label="Welcome" className="relative">
      {/* Backdrop: cross-dissolving stills under an ivory wash that is
          left-weighted and gone by the midpoint, so the headline keeps its
          contrast while the photography still reads. The phone layout runs
          the copy across the full width, so it holds a lighter wash all the
          way over; from lg the right half is the photograph alone. */}
      <div className="absolute inset-0 -z-10">
        <HeroSlideshow id={HERO_STAGE_ID} />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_oklch,var(--background),transparent_8%)_0%,color-mix(in_oklch,var(--background),transparent_28%)_45%,color-mix(in_oklch,var(--background),transparent_55%)_100%)] lg:bg-[linear-gradient(90deg,color-mix(in_oklch,var(--background),transparent_12%)_0%,color-mix(in_oklch,var(--background),transparent_45%)_32%,transparent_62%)]"
        />
      </div>

      <div className="mx-auto w-full max-w-[1320px] px-4 lg:px-3">
        <div className="flex min-h-[70vh] flex-col justify-center pt-36 pb-16 sm:pb-24 lg:min-h-[750px] lg:pt-[161px]">
          <Reveal className="max-w-3xl">
            <p className={EYEBROW}>{HERO.eyebrow}</p>
            {/* Staircase headline: line two steps inward. */}
            <h1 className="mt-5 font-heading text-[46px] leading-[1.1] font-light tracking-[-0.01em] text-foreground sm:text-[68px] lg:text-[92px]">
              {HERO.titleLine1}
              <span className="block sm:pl-[12%]">{HERO.titleLine2}</span>
            </h1>
            <p className="mt-6 max-w-lg text-[15px] leading-[26px] text-foreground/80 sm:text-lg sm:leading-relaxed">
              {HERO.blurb}
            </p>
          </Reveal>

          {/* Stop/start for the backdrop. Parked on the outer edge, below
              the copy and clear of the booking bar, so it never competes
              with the headline. */}
          <div className="mt-8 flex justify-end sm:mt-10">
            <HeroMotionToggle stageId={HERO_STAGE_ID} />
          </div>
        </div>

        {/* Booking bar riding the hero's bottom edge. */}
        <Reveal delay={0.15} className="relative -mb-14 pb-0 sm:-mb-12">
          <BookingBar />
        </Reveal>
      </div>
    </section>
  );
}
