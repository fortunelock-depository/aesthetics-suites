// src/components/site/interlocking-rows.tsx
import { Sparkles } from 'lucide-react';
import { PhotoFrame } from './photo-frame';
import { Reveal } from './reveal';
import { CtaLink } from './cta-link';
import type { IEditorialRow } from '@/lib/hotel/editorial';
import { cn } from '@/lib/utils';

/**
 * The template's alternating feature rows (interlocking image/text with an
 * offset light-gray band bleeding past the content edge), shared by the
 * facilities and services surfaces. READ MORE leads to
 * `{hrefBase}/{slug}`.
 */
export function InterlockingRows({
  items,
  hrefBase,
  id,
}: {
  items: IEditorialRow[];
  /** Detail route prefix, e.g. "/facilities". */
  hrefBase: string;
  /** Anchor id for in-page navigation (homepage sections). */
  id?: string;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 mx-auto w-full max-w-[1320px] space-y-16 px-4 pb-16 lg:px-3 lg:space-y-[60px] lg:pb-[120px]"
    >
      {items.map((item, index) => {
        const flipped = index % 2 === 1;
        const cover = item.photos[0];
        return (
          <div key={item.id} className="relative">
            {/* Offset band behind the row (the template's bg-left/bg-right). */}
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
                <p className="text-[15px] font-semibold text-brand-text capitalize">
                  {item.eyebrow}
                </p>
                <h3 className="mt-2.5 font-heading text-[28px] leading-snug font-medium text-foreground [overflow-wrap:anywhere] lg:text-[38px]">
                  {item.name}
                </h3>
                <p className="mt-4 max-w-md text-[15px] leading-[26px] text-muted-foreground">
                  {item.summary}
                </p>
                <CtaLink
                  href={`${hrefBase}/${item.slug}`}
                  variant="outline"
                  sweep="gold"
                  className="mt-8"
                >
                  Read More
                </CtaLink>
              </Reveal>
            </div>
          </div>
        );
      })}
    </section>
  );
}
