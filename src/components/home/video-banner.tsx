// src/components/home/video-banner.tsx
import Image from 'next/image';
import { CtaLink } from '@/components/site/cta-link';
import { Reveal } from '@/components/site/reveal';
import { BOOK_NOW_HREF } from '@/components/site/nav-links';
import { VIDEO_BANNER } from '@/static-data/home';

/**
 * The band below the rooms grid: 510px tall, display heading left and the
 * booking call to action right. The photo is a next/image fill behind the
 * scrim, so it gets responsive sizes and AVIF. No fixed-attachment
 * parallax: mobile Safari ignores it anyway, and a still cover image reads
 * the same at this height.
 */
export function VideoBanner() {
  return (
    <section
      aria-label="Book online"
      className="relative h-[420px] overflow-hidden md:h-[510px]"
    >
      <Image
        src={VIDEO_BANNER.image.src}
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
        aria-hidden
      />
      {/* The copy sits left, so the ink wash is left-weighted and thins out
          across the frame rather than flattening the whole photograph. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_oklch,var(--scrim),transparent_25%)_0%,color-mix(in_oklch,var(--scrim),transparent_55%)_55%,color-mix(in_oklch,var(--scrim),transparent_75%)_100%)]"
      />

      <div className="relative mx-auto flex h-full w-full max-w-[1320px] flex-col items-start justify-center gap-10 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-3">
        <Reveal from="left">
          <h2 className="max-w-2xl font-heading text-[34px] leading-[1.2] font-light tracking-[-0.01em] text-white lg:text-[50px]">
            {VIDEO_BANNER.title}
          </h2>
          <p className="mt-4 max-w-md text-white/85">{VIDEO_BANNER.blurb}</p>
        </Reveal>
        <Reveal from="right">
          <CtaLink href={BOOK_NOW_HREF}>Check availability</CtaLink>
        </Reveal>
      </div>
    </section>
  );
}
