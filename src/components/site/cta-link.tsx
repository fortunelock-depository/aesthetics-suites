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

/**
 * The one call-to-action treatment: square, small tracked caps, a trailing
 * arrow, and the both-ends-to-center fill on hover. Exported on its own so a
 * control that cannot be a link (a form submit, an action with a handler) can
 * carry the same button without the classes being restated and drifting.
 */
export const CTA_CLASS =
  'btn-sweep inline-flex items-center gap-2.5 px-[38px] py-[15px] text-[13px] font-medium tracking-[0.14em] uppercase transition-[color,opacity] duration-200 active:opacity-90';

export const ctaClasses = ({
  sweep = 'light',
  variant = 'solid',
  className,
}: {
  sweep?: Sweep;
  variant?: 'solid' | 'outline';
  className?: string;
} = {}) =>
  cn(
    CTA_CLASS,
    variant === 'solid' && 'bg-brand text-brand-foreground',
    variant === 'outline' && 'border border-brand bg-transparent text-brand-text',
    SWEEP_CLASS[sweep],
    className,
  );

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
   * unhover): 'light' fills with peach over ink text, 'dark' fills with the
   * olive ink over ivory text, 'gold' fills the outline variant with clay.
   */
  sweep?: Sweep;
  /** 'solid' clay block or the 'outline' clay-bordered variant. */
  variant?: 'solid' | 'outline';
  /** Rendered after the label; defaults to the trailing arrow. */
  icon?: React.ReactNode;
}

export function CtaLink({
  href,
  children,
  className,
  sweep = 'light',
  variant = 'solid',
  icon,
}: CtaLinkProps) {
  const classes = ctaClasses({ sweep, variant, className });
  const content = (
    <>
      {children}
      {icon ?? <ArrowRight className="h-4 w-4" />}
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

interface CtaButtonProps
  extends Omit<React.ComponentProps<'button'>, 'children'> {
  children: React.ReactNode;
  sweep?: Sweep;
  variant?: 'solid' | 'outline';
  /** Rendered after the label; defaults to the trailing arrow. */
  icon?: React.ReactNode;
}

/**
 * The same button for an action rather than a destination: form submits and
 * anything with a handler. A link cannot submit a form, and a button cannot
 * navigate, so the two exist side by side over one class definition.
 */
export function CtaButton({
  children,
  className,
  sweep = 'light',
  variant = 'solid',
  icon,
  type = 'button',
  ...props
}: CtaButtonProps) {
  return (
    <button
      type={type}
      className={ctaClasses({ sweep, variant, className })}
      {...props}
    >
      {children}
      {icon ?? <ArrowRight className="h-4 w-4" />}
    </button>
  );
}
