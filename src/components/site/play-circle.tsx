// src/components/site/play-circle.tsx
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArcRing } from './arc-ring';

const SIZES = {
  /** The hero medallion (100px). */
  md: 'h-[100px] w-[100px]',
  /** The media-band medallion (150px). */
  lg: 'h-[110px] w-[110px] lg:h-[150px] lg:w-[150px]',
} as const;

/**
 * The play medallion (.video__play): a faint 1px static ring with the
 * play glyph, plus the tapered arc orbiting it continuously (2s linear).
 * Ring, arc, and glyph warm to gold on hover. Decorative until a
 * video/booking action backs it.
 */
export function PlayCircle({
  className,
  tone = 'light',
  size = 'md',
}: {
  className?: string;
  /** 'light' for dark imagery (white ring), 'dark' for light surfaces. */
  tone?: 'light' | 'dark';
  size?: keyof typeof SIZES;
}) {
  const ring =
    tone === 'light' ? 'border-white/40' : 'border-foreground/30';
  const glyph = tone === 'light' ? 'text-white' : 'text-foreground';
  const arcColor = tone === 'light' ? '#ffffff' : '#252A1C';

  return (
    <span
      aria-hidden
      className={cn(
        'group relative grid flex-none cursor-pointer place-items-center rounded-full border transition-colors duration-300 hover:border-brand/60',
        SIZES[size],
        ring,
        className,
      )}
    >
      {/* Continuous orbit; the gold twin fades in over it on hover. */}
      <ArcRing color={arcColor} className="play-arc opacity-100 transition-opacity duration-300 group-hover:opacity-0" />
      <ArcRing color="#DCA278" className="play-arc opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <Play
        className={cn(
          'h-5 w-5 fill-current transition-colors duration-300 lg:h-6 lg:w-6',
          glyph,
          'group-hover:text-brand',
        )}
      />
    </span>
  );
}
