// src/components/site/cta-link.tsx
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Sweep = 'light' | 'dark' | 'gold';

const SWEEP_CLASS: Record<Sweep, string> = {
  light: 'btn-sweep-light',
  dark: 'btn-sweep-dark',
  gold: 'btn-sweep-gold',
};

interface CtaLinkProps {
  /**
   * Omit while the destination page doesn't exist yet: renders the same
   * button as a non-navigating placeholder (never a dead '#' link).
   */
  href?: string;
  children: React.ReactNode;
  className?: string;
  /**
   * The hover fill (grows in from both ends to the center, retreats on
   * unhover): 'light' -> white bg + dark text, 'dark' -> near-black bg +
   * white text, 'gold' -> solid gold + white.
   */
  sweep?: Sweep;
  /** 'solid' gold block or the 'outline' gold-bordered variant. */
  variant?: 'solid' | 'outline';
}

/**
 * The call-to-action button: square, 16px uppercase, 16x43px padding,
 * trailing arrow, with the both-ends-to-center color sweep on hover.
 */
export function CtaLink({
  href,
  children,
  className,
  sweep = 'light',
  variant = 'solid',
}: CtaLinkProps) {
  const classes = cn(
    'btn-sweep inline-flex items-center gap-2.5 px-[43px] py-4 font-heading text-base font-bold uppercase',
    variant === 'solid' && 'bg-brand text-brand-foreground',
    variant === 'outline' && 'border border-brand bg-transparent text-brand-text',
    SWEEP_CLASS[sweep],
    className,
  );

  const content = (
    <>
      {children}
      <ArrowRight className="h-4 w-4" />
    </>
  );

  if (!href) {
    // No pointer cursor: a placeholder span must not pretend to be a link.
    return <span className={cn(classes, 'select-none')}>{content}</span>;
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
