// src/utils/revalidate.ts
import 'server-only';
import { revalidatePath } from 'next/cache';
import { facilityDetail, roomDetail, serviceDetail } from '@/lib/routes';

// Public pages are server-rendered from the DB and statically cached; admin mutations call these helpers so changes
// appear without a redeploy (on-demand ISR). Add a helper per public
// surface and call it from every mutation route that affects it.
//
// Every helper also purges /sitemap.xml, which is built from the same three
// data sources: publishing, renaming or removing an entity otherwise leaves
// the sitemap advertising the old set for up to an hour.
//
// There is deliberately NO helper for season rates or discounts. Cached
// pages render only `basePrice`; every seasonal and discounted figure is
// computed live by /api/rooms/[slug]/availability, so those mutations have
// nothing static to purge.

const SITEMAP = '/sitemap.xml';

/**
 * Invalidates the public room pages after a room mutation: the listing, the
 * changed room's detail page, and the home page (featured section).
 */
export function revalidatePublicRooms(slug?: string): void {
  revalidatePath('/');
  revalidatePath('/rooms');
  if (slug) revalidatePath(roomDetail(slug));
  revalidatePath(SITEMAP);
}

/**
 * Invalidates the public facility pages after a facility mutation: the
 * home page rows, the /facilities catalogue, and the changed detail page.
 */
export function revalidatePublicFacilities(slug?: string): void {
  revalidatePath('/');
  revalidatePath('/facilities');
  if (slug) revalidatePath(facilityDetail(slug));
  revalidatePath(SITEMAP);
}

/**
 * Invalidates the public service pages after a service mutation: the home
 * page trio, the /services catalogue, and the changed detail page.
 */
export function revalidatePublicServices(slug?: string): void {
  revalidatePath('/');
  revalidatePath('/services');
  if (slug) revalidatePath(serviceDetail(slug));
  revalidatePath(SITEMAP);
}
