// src/components/site/photo-gallery.tsx
'use client';

import * as React from 'react';
import Image from 'next/image';
import { Dialog as DialogPrimitive } from 'radix-ui';
import type { LucideIcon } from 'lucide-react';
import {
  BedDouble,
  ChevronLeft,
  ChevronRight,
  Expand,
  ImageIcon,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PhotoFrame } from './photo-frame';

export interface GalleryPhoto {
  url: string;
  alt: string | null;
}

/** The most photos a detail page shows (grid and viewer alike). */
export const GALLERY_MAX_PHOTOS = 10;

/**
 * Placeholder glyph for a missing photo, chosen by NAME. This is a client
 * component rendered from server pages, and a React component (a function)
 * cannot cross that boundary as a prop - only serializable values can. So
 * the server says "room" or "editorial" and the icon is resolved here.
 */
export type GalleryPlaceholder = 'room' | 'editorial' | 'generic';
const PLACEHOLDER_ICON: Record<GalleryPlaceholder, LucideIcon> = {
  room: BedDouble,
  editorial: Sparkles,
  generic: ImageIcon,
};

interface GalleryContextValue {
  photos: GalleryPhoto[];
  name: string;
  icon?: LucideIcon;
  open: (index: number) => void;
}

const GalleryContext = React.createContext<GalleryContextValue | null>(null);

function useGallery(component: string): GalleryContextValue {
  const ctx = React.useContext(GalleryContext);
  if (!ctx) {
    throw new Error(`${component} must be rendered inside <PhotoGallery>.`);
  }
  return ctx;
}

/**
 * Owns the photo set and the full-view lightbox for a detail page. Wrap the
 * part of the page that shows the photos, then place `GalleryCover` and/or
 * `GalleryGrid` anywhere inside - every tile opens the same viewer, which
 * pages through the whole set with previous/next, arrow keys and swipe.
 *
 * Capped at GALLERY_MAX_PHOTOS: the admin can upload more, but the page
 * shows the first ten (admin sort order), which is plenty for a listing.
 */
export function PhotoGallery({
  photos,
  name,
  placeholder = 'generic',
  children,
}: {
  photos: GalleryPhoto[];
  /** What the photos are of, for alt/label fallbacks ("Deluxe Suite"). */
  name: string;
  /** Placeholder glyph when a photo is missing (a name, never a component). */
  placeholder?: GalleryPlaceholder;
  children: React.ReactNode;
}) {
  const icon = PLACEHOLDER_ICON[placeholder];
  const shown = React.useMemo(
    () => photos.slice(0, GALLERY_MAX_PHOTOS),
    [photos],
  );
  const [index, setIndex] = React.useState<number | null>(null);

  const open = React.useCallback((i: number) => setIndex(i), []);
  const value = React.useMemo(
    () => ({ photos: shown, name, icon, open }),
    [shown, name, icon, open],
  );

  return (
    <GalleryContext.Provider value={value}>
      {children}
      <Lightbox
        photos={shown}
        name={name}
        index={index}
        onIndexChange={setIndex}
      />
    </GalleryContext.Provider>
  );
}

/** A clickable tile: the photo, plus a quiet expand hint on hover/focus. */
function GalleryTile({
  photo,
  index,
  className,
  sizes,
  priority,
}: {
  photo: GalleryPhoto;
  index: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const { photos, name, icon, open } = useGallery('GalleryTile');
  return (
    <button
      type="button"
      onClick={() => open(index)}
      aria-label={`View photo ${index + 1} of ${photos.length}: ${photo.alt ?? name}`}
      className={cn(
        'group relative block w-full cursor-zoom-in overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
    >
      <PhotoFrame
        src={photo.url}
        alt={photo.alt ?? name}
        icon={icon}
        className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        sizes={sizes}
        priority={priority}
      />
      <span
        aria-hidden
        className="absolute right-3 bottom-3 grid h-8 w-8 place-items-center bg-scrim/70 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <Expand className="h-4 w-4" />
      </span>
    </button>
  );
}

/** The lead photo (index 0) as a full-width frame, opening the viewer. */
export function GalleryCover({
  className,
  sizes,
  priority,
}: {
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const { photos, name, icon } = useGallery('GalleryCover');
  const cover = photos[0];
  if (!cover) {
    // Nothing uploaded yet: the honest placeholder, not clickable.
    return (
      <PhotoFrame src={null} alt={name} icon={icon} className={className} />
    );
  }
  return (
    <GalleryTile
      photo={cover}
      index={0}
      className={className}
      sizes={sizes}
      priority={priority}
    />
  );
}

/**
 * The photo grid: two across on phones, three from md. `from` skips the
 * leading photos a page already shows elsewhere (the editorial cover).
 */
export function GalleryGrid({
  from = 0,
  className,
}: {
  from?: number;
  className?: string;
}) {
  const { photos } = useGallery('GalleryGrid');
  const items = photos.slice(from);
  if (items.length === 0) return null;
  // A single photo takes the full width instead of sitting as one small
  // tile in an otherwise empty grid.
  if (items.length === 1) {
    return (
      <GalleryTile
        photo={items[0]}
        index={from}
        className={cn('aspect-video', className)}
        sizes="(max-width: 1024px) 100vw, 966px"
      />
    );
  }
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3',
        className,
      )}
    >
      {items.map((photo, i) => (
        <GalleryTile
          key={photo.url}
          photo={photo}
          index={from + i}
          className="aspect-4/3"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
        />
      ))}
    </div>
  );
}

const SWIPE_THRESHOLD_PX = 40;

/**
 * Full-view photo viewer: a deep ink stage, the photo contained (never
 * cropped), previous/next, a counter, the caption, and close. Arrow keys
 * page, Escape closes (radix), and a horizontal swipe pages on touch.
 */
function Lightbox({
  photos,
  name,
  index,
  onIndexChange,
}: {
  photos: GalleryPhoto[];
  name: string;
  index: number | null;
  onIndexChange: (index: number | null) => void;
}) {
  const open = index !== null && photos.length > 0;
  const count = photos.length;
  const current = open ? photos[Math.min(index, count - 1)] : null;
  const canPage = count > 1;

  const step = React.useCallback(
    (delta: number) => {
      if (index === null || !canPage) return;
      onIndexChange((index + delta + count) % count);
    },
    [index, canPage, count, onIndexChange],
  );

  // Swipe: remember where the pointer went down, page on a clear
  // horizontal release. Mouse drags qualify too, which is harmless.
  const startX = React.useRef<number | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    step(dx < 0 ? 1 : -1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    }
  };

  const navButton =
    'grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-scrim/50 text-white transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none';

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onIndexChange(null);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-scrim/95" />
        <DialogPrimitive.Content
          onKeyDown={onKeyDown}
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 flex flex-col text-white outline-none"
        >
          <DialogPrimitive.Title className="sr-only">
            {name} photos
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Photo viewer. Use the previous and next buttons or the arrow keys
            to move between photos, and Escape to close.
          </DialogPrimitive.Description>

          {/* Top bar: counter left, close right. */}
          <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 sm:px-6">
            {/* Paging is otherwise silent: the counter and the caption
                change with nothing to announce them. One atomic status
                carries both, so a page reads as "Photo 3 of 9: ...". */}
            <p
              role="status"
              aria-atomic="true"
              className="text-sm font-medium tabular-nums text-white/80"
            >
              <span aria-hidden>{open ? `${index + 1} / ${count}` : ''}</span>
              <span className="sr-only">
                {open
                  ? `Photo ${index + 1} of ${count}: ${current?.alt ?? name}`
                  : ''}
              </span>
            </p>
            <DialogPrimitive.Close
              className={cn(navButton, 'h-10 w-10')}
              aria-label="Close photo viewer"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Stage: the photo, contained. Key on the url so each change
              fades in rather than snapping. */}
          <div
            className="relative min-h-0 flex-1 touch-pan-y select-none"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              startX.current = null;
            }}
          >
            {current && (
              <Image
                key={current.url}
                src={current.url}
                alt={current.alt ?? name}
                fill
                sizes="100vw"
                className="animate-in fade-in-0 object-contain duration-300"
                priority
                draggable={false}
              />
            )}

            {canPage && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous photo"
                  className={cn(
                    navButton,
                    'absolute top-1/2 left-3 -translate-y-1/2 sm:left-6',
                  )}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next photo"
                  className={cn(
                    navButton,
                    'absolute top-1/2 right-3 -translate-y-1/2 sm:right-6',
                  )}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          {/* Caption. Reserved height so the stage never jumps between
              captioned and uncaptioned photos. */}
          <p className="min-h-12 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-white/75 [overflow-wrap:anywhere] sm:px-6">
            {current?.alt ?? ''}
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
