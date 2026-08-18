// src/components/home/facilities-section.tsx
import { InterlockingRows } from '@/components/site/interlocking-rows';
import type { IPublicFacility } from '@/lib/hotel/public-facilities';

/**
 * The facilities rows (homepage + /facilities): the shared interlocking
 * layout pointed at the facility detail pages.
 */
export function FacilitiesSection({
  facilities,
  spacedTop = false,
}: {
  facilities: IPublicFacility[];
  /** True when nothing sits between these rows and the media band above. */
  spacedTop?: boolean;
}) {
  return (
    <InterlockingRows
      id="facilities"
      items={facilities}
      hrefBase="/facilities"
      spacedTop={spacedTop}
    />
  );
}
