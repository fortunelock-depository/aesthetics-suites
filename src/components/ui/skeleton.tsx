import { cn } from '@/lib/utils';

/** Pulsing placeholder block for loading states. */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-lg bg-muted', className)}
      {...props}
    />
  );
}
