// src/components/site/photo-frame.tsx
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoFrameProps {
  /** Cloudinary/remote URL; when absent a decorative placeholder renders. */
  src?: string | null;
  alt?: string | null;
  /** Placeholder icon (defaults to a generic image glyph). */
  icon?: LucideIcon;
  className?: string;
  sizes?: string;
  /** Prioritize loading (above-the-fold imagery). */
  priority?: boolean;
}

/**
 * An image slot that degrades honestly: with a `src` it renders next/image
 * (cover-cropped); without one it shows a quiet, on-brand placeholder
 * instead of a broken image - so the landing page looks intentional before
 * any photos are uploaded. Give the wrapper its size via `className`
 * (aspect-* or fixed heights).
 */
export function PhotoFrame({
  src,
  alt,
  icon: Icon = ImageIcon,
  className,
  sizes,
  priority = false,
}: PhotoFrameProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        !src &&
          'bg-[linear-gradient(135deg,var(--muted)_0%,var(--accent)_55%,var(--secondary)_100%)]',
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt ?? ''}
          fill
          sizes={sizes ?? '(max-width: 768px) 100vw, 50vw'}
          className="object-cover"
          priority={priority}
        />
      ) : (
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center text-brand/40"
        >
          <Icon className="h-10 w-10" strokeWidth={1.25} />
        </span>
      )}
    </div>
  );
}
