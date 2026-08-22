// src/components/site/section-heading.tsx
import { cn } from '@/lib/utils';

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
      <p className="text-[15px] font-semibold text-brand-text capitalize">
        {eyebrow}
      </p>
      <h2 className="mt-2.5 font-heading text-[32px] leading-[1.3] font-medium text-foreground [overflow-wrap:anywhere] lg:text-[45px] lg:leading-[60px]">
        {title}
      </h2>
    </div>
  );
}
