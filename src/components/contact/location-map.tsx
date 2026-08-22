// src/components/contact/location-map.tsx
'use client';

import { useState } from 'react';
import { Loader2, Navigation } from 'lucide-react';
import { EYEBROW } from '@/components/site/section-heading';
import { SITE, CONTACT } from '@/config/constants';

/**
 * The map section: a Google Maps embed using `q=label@lat,lng` (which
 * drops a labelled pin - the `pb=` form only frames an area), a loading
 * overlay until the iframe paints, and a directions link that opens
 * turn-by-turn navigation from wherever the visitor is.
 *
 * The desaturated-until-hover treatment is pointer-only (lg and up): a
 * touch device has no hover to clear it with, so on a phone the map would
 * simply be permanently grey.
 */
export function LocationMap() {
  const [isLoading, setIsLoading] = useState(true);
  const { lat, lng } = CONTACT.map;

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    `${SITE.name}@${lat},${lng}`,
  )}&t=&z=16&ie=UTF8&iwloc=B&output=embed`;

  const directionsLink = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <section
      aria-label="Our location"
      className="group relative mx-auto w-full max-w-[1320px] px-4 pb-16 lg:px-3 lg:pb-[120px]"
    >
      <div className="relative h-[400px] w-full overflow-hidden bg-muted/30 lg:h-[570px]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2
                strokeWidth={1.5}
                className="h-10 w-10 animate-spin text-brand"
              />
              <p className={EYEBROW}>Loading map</p>
            </div>
          </div>
        )}

        <iframe
          src={mapUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          onLoad={() => setIsLoading(false)}
          referrerPolicy="no-referrer-when-downgrade"
          title={`${SITE.name} location`}
          className="transition-[filter] duration-700 ease-in-out lg:[filter:grayscale(35%)_contrast(1.05)_opacity(0.95)] lg:group-hover:[filter:none]"
        />

        <a
          href={directionsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-sweep btn-sweep-dark absolute right-4 bottom-4 inline-flex items-center gap-2.5 bg-brand px-6 py-3.5 text-[13px] font-medium tracking-[0.14em] text-brand-foreground uppercase transition-[color,opacity] duration-200 active:opacity-90"
        >
          <Navigation className="h-4 w-4" />
          Get directions
        </a>
      </div>
    </section>
  );
}
