// src/utils/revalidate.ts
import 'server-only';
import { revalidatePath } from 'next/cache';

// The portfolio cache pattern: public pages are server-rendered from the DB
// and statically cached; admin mutations call these helpers so changes
// appear without a redeploy (on-demand ISR). Add a helper per public
// surface and call it from every mutation route that affects it.

/** Invalidates the home page (featured rooms, hero content). */
export function revalidatePublicHome(): void {
  revalidatePath('/');
}

/**
 * Invalidates the public room pages after a room mutation: the listing, the
 * changed room's detail page, and the home page (featured section).
 */
export function revalidatePublicRooms(slug?: string): void {
  revalidatePath('/');
  revalidatePath('/rooms');
  if (slug) revalidatePath(`/rooms/${slug}`);
}

/**
 * Invalidates the public facility pages after a facility mutation: the
 * home page rows, the /facilities catalogue, and the changed detail page.
 */
export function revalidatePublicFacilities(slug?: string): void {
  revalidatePath('/');
  revalidatePath('/facilities');
  if (slug) revalidatePath(`/facilities/${slug}`);
}

/**
 * Invalidates the public service pages after a service mutation: the home
 * page trio, the /services catalogue, and the changed detail page.
 */
export function revalidatePublicServices(slug?: string): void {
  revalidatePath('/');
  revalidatePath('/services');
  if (slug) revalidatePath(`/services/${slug}`);
}
