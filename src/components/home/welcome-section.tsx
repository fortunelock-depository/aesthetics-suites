// src/components/home/welcome-section.tsx
import { Armchair, Sparkles } from 'lucide-react';
import { CtaLink } from '@/components/site/cta-link';
import { PhotoFrame } from '@/components/site/photo-frame';
import { Reveal } from '@/components/site/reveal';
import { SectionHeading } from '@/components/site/section-heading';
import { SITE } from '@/config/constants';
import { WELCOME_PHOTOS } from '@/static-data/home';
import { BOOK_NOW_HREF } from '@/components/site/nav-links';

/**
 * The "Welcome" section: heading + blurb left, the template's two
 * overlapping photos right (offset frames), gold CTA.
 */
export function WelcomeSection() {
  return (
    <section className="mx-auto w-full max-w-[1320px] px-4 pt-32 pb-16 lg:px-3 lg:pt-[168px] lg:pb-[120px]">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal from="left">
          <SectionHeading
            eyebrow="Accommodations"
            title={`Welcome to ${SITE.name}`}
          />
          <p className="mt-5 max-w-md text-[15px] leading-[26px] text-muted-foreground">
            Every suite is designed around rest: natural light, quiet
            materials, and the small comforts that make a stay feel like a
            retreat rather than a stopover.
          </p>
          <CtaLink href={BOOK_NOW_HREF} sweep="dark" className="mt-9">
            Read More
          </CtaLink>
        </Reveal>

        {/* Overlapping photo pair (stacked collage from the template). */}
        <Reveal from="right" className="relative mx-auto w-full max-w-md lg:max-w-none">
          <PhotoFrame
            src={WELCOME_PHOTOS.main.src}
            alt={WELCOME_PHOTOS.main.alt}
            icon={Armchair}
            className="aspect-4/3 w-4/5"
            sizes="(max-width: 1024px) 80vw, 40vw"
          />
          <PhotoFrame
            src={WELCOME_PHOTOS.inset.src}
            alt={WELCOME_PHOTOS.inset.alt}
            icon={Sparkles}
            className="absolute right-0 -bottom-10 aspect-square w-1/2 border-8 border-background"
            sizes="(max-width: 1024px) 40vw, 20vw"
          />
          {/* Spacer so the overlap never collides with the next section. */}
          <div aria-hidden className="h-10" />
        </Reveal>
      </div>
    </section>
  );
}
