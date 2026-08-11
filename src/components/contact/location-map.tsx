// src/components/contact/location-map.tsx
'use client';

import { useState } from 'react';
import { Loader2, Navigation } from 'lucide-react';
import { SITE, CONTACT } from '@/config/constants';

/**
 * The map section, done the mhp website-frontend way: a Google Maps embed
 * using `q=label@lat,lng` (which drops a labelled pin - the `pb=` form only
 * frames an area), a loading overlay until the iframe paints, a light
 * grayscale treatment at rest that clears on hover, and a "Get Directions"
 * link that opens turn-by-turn navigation from wherever the visitor is.
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
              <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
                Loading Map
              </p>
            </div>
          </div>
        )}

        <iframe
          src={mapUrl}
          width="100%"
          height="100%"
          style={{
            border: 0,
            // Light treatment at rest so the pin stays legible; hover
            // clears it to full colour.
            filter: 'grayscale(35%) contrast(1.05) opacity(0.95)',
          }}
          allowFullScreen
          loading="lazy"
          onLoad={() => setIsLoading(false)}
          referrerPolicy="no-referrer-when-downgrade"
          title={`${SITE.name} location`}
          className="transition-all duration-1000 ease-in-out group-hover:opacity-100 group-hover:filter-none"
        />

        <a
          href={directionsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-4 bottom-4 inline-flex items-center gap-2 bg-brand px-5 py-3 font-heading text-sm font-bold text-brand-foreground uppercase shadow-lg transition-opacity hover:opacity-90"
        >
          <Navigation className="h-4 w-4" />
          Get Directions
        </a>
      </div>
    </section>
  );
}
