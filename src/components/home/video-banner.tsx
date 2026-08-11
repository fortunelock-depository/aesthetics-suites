// src/components/home/video-banner.tsx
import { Reveal } from '@/components/site/reveal';
import { PlayCircle } from '@/components/site/play-circle';
import { VIDEO_BANNER } from '@/static-data/home';

/**
 * The template's parallax band below the rooms grid, measured: 510px tall,
 * `background-attachment: fixed` (the image holds still while the page
 * scrolls past), cover/center, white display heading left + circular
 * play-style CTA right. Fixed attachment is unreliable on mobile Safari,
 * so phones fall back to a normal scrolling background.
 */
export function VideoBanner() {
  return (
    <section
      aria-label="Book online"
      className="relative h-[420px] bg-cover bg-center bg-scroll md:h-[510px] md:bg-fixed"
      style={{ backgroundImage: `url(${VIDEO_BANNER.image.src})` }}
    >
      {/* Scrim for text legibility over the photo. */}
      <div aria-hidden className="absolute inset-0 bg-black/45" />

      <div className="relative mx-auto flex h-full w-full max-w-[1320px] flex-col items-start justify-center gap-10 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-3">
        <Reveal from="left">
          <h2 className="max-w-2xl font-heading text-[32px] leading-[1.3] font-medium text-white lg:text-[45px] lg:leading-[60px]">
            {VIDEO_BANNER.title}
          </h2>
          <p className="mt-3 text-white/80">{VIDEO_BANNER.blurb}</p>
        </Reveal>
        <Reveal from="right">
          <PlayCircle tone="light" size="lg" />
        </Reveal>
      </div>
    </section>
  );
}
