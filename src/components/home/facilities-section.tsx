// src/components/home/facilities-section.tsx
import { InterlockingRows } from '@/components/site/interlocking-rows';
import type { IPublicFacility } from '@/lib/hotel/public-facilities';

/**
 * The facilities rows (homepage + /facilities): the shared interlocking
 * layout pointed at the facility detail pages.
 */
export function FacilitiesSection({
  facilities,
}: {
  facilities: IPublicFacility[];
}) {
  return (
    <InterlockingRows id="facilities" items={facilities} hrefBase="/facilities" />
  );
}
