// src/components/site/interlocking-rows.tsx
import { Sparkles } from 'lucide-react';
import { PhotoFrame } from './photo-frame';
import { Reveal } from './reveal';
import { CtaLink } from './cta-link';
import { EYEBROW } from './section-heading';
import type { IEditorialRow } from '@/lib/hotel/editorial';
import { cn } from '@/lib/utils';

/**
 * Alternating feature rows: interlocking image/text with an offset soft
 * band bleeding past the content edge, shared by the facilities and
 * services surfaces. The row's call to action leads to
 * `{hrefBase}/{slug}`.
 */
export function InterlockingRows({
  items,
  hrefBase,
  id,
  spacedTop = false,
}: {
  items: IEditorialRow[];
  /** Detail route prefix, e.g. "/facilities". */
  hrefBase: string;
  /** Anchor id for in-page navigation (homepage sections). */
  id?: string;
  /**
   * Adds the standard section gap ABOVE the rows. Off by default because
   * the section that normally precedes these rows (the services strip on
   * the homepage, the banner spacer on /facilities) already carries it;
   * turn it on when nothing sits between the rows and a full-bleed block.
   */
  spacedTop?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-24 mx-auto w-full max-w-[1320px] space-y-16 px-4 pb-16 lg:px-3 lg:space-y-[60px] lg:pb-[120px]',
        spacedTop && 'pt-16 lg:pt-[120px]',
      )}
    >
      {items.map((item, index) => {
        const flipped = index % 2 === 1;
        const cover = item.photos[0];
        return (
          <div key={item.id} className="relative">
            {/* Offset band behind the row, left or right by index. */}
            <div
              aria-hidden
              className={cn(
                'absolute inset-y-6 -z-10 hidden w-2/3 bg-muted/50 lg:block',
                flipped ? 'right-0' : 'left-0',
              )}
            />
            <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14 lg:px-10">
              <Reveal
                from={flipped ? 'right' : 'left'}
                className={cn(flipped && 'lg:order-2')}
              >
                <PhotoFrame
                  src={cover?.url}
                  alt={cover?.alt ?? item.name}
                  icon={Sparkles}
                  className="aspect-3/2 w-full"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </Reveal>
              <Reveal
                from={flipped ? 'left' : 'right'}
                className={cn(flipped && 'lg:order-1')}
              >
                <p className={EYEBROW}>{item.eyebrow}</p>
                <h3 className="mt-3 font-heading text-[30px] leading-[1.15] font-light tracking-[-0.01em] text-foreground [overflow-wrap:anywhere] lg:text-[42px]">
                  {item.name}
                </h3>
                <p className="mt-4 max-w-md text-[15px] leading-[26px] text-foreground/80">
                  {item.summary}
                </p>
                <CtaLink
                  href={`${hrefBase}/${item.slug}`}
                  variant="outline"
                  sweep="gold"
                  className="mt-8"
                >
                  Explore
                </CtaLink>
              </Reveal>
            </div>
          </div>
        );
      })}
    </section>
  );
}
