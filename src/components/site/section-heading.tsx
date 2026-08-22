// src/components/site/section-heading.tsx
import { cn } from '@/lib/utils';

/**
 * The one eyebrow treatment. Small tracked caps in clay: the site had three
 * competing versions of this label, which read as three different systems on
 * one page. Import this rather than restating the classes.
 */
export const EYEBROW =
  'text-[12px] font-medium tracking-[0.2em] text-brand-text uppercase';

interface SectionHeadingProps {
  /** Small gold kicker above the title, e.g. "Deluxe And Luxury". */
  eyebrow: string;
  title: string;
  align?: 'left' | 'center';
  className?: string;
}

/**
 * The section heading: 15px semibold gold eyebrow in capitalize (not
 * uppercase), then the 45/60px medium display title.
 */
export function SectionHeading({
  eyebrow,
  title,
  align = 'left',
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn(align === 'center' && 'text-center', className)}>
      <p className={EYEBROW}>{eyebrow}</p>
      <h2 className="mt-4 font-heading text-[34px] leading-[1.15] font-light tracking-[-0.01em] text-foreground [overflow-wrap:anywhere] lg:text-[52px]">
        {title}
      </h2>
    </div>
  );
}
