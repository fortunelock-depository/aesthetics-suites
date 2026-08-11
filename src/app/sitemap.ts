// src/app/sitemap.ts
import type { MetadataRoute } from 'next';
import { SITE } from '@/config/constants';
import { getPublicRoomCards } from '@/lib/hotel/public-rooms';
import { getPublicFacilities } from '@/lib/hotel/public-facilities';
import { getPublicServices } from '@/lib/hotel/public-services';

// Regenerates hourly so newly published rooms/facilities reach the sitemap
// without a redeploy (mutations only revalidate the page routes).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    { path: '', changeFrequency: 'yearly' as const, priority: 1 },
    { path: '/rooms', changeFrequency: 'weekly' as const, priority: 0.9 },
    { path: '/facilities', changeFrequency: 'monthly' as const, priority: 0.7 },
    { path: '/services', changeFrequency: 'monthly' as const, priority: 0.7 },
    { path: '/contact', changeFrequency: 'yearly' as const, priority: 0.8 },
    { path: '/privacy-policy', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/terms-of-service', changeFrequency: 'yearly' as const, priority: 0.3 },
  ];

  const [dbRooms, facilities, services] = await Promise.all([
    getPublicRoomCards(),
    getPublicFacilities(),
    getPublicServices(),
  ]);
  const rooms = dbRooms;

  return [
    ...staticRoutes.map((route) => ({
      url: `${SITE.url}${route.path}`,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...rooms.map((room) => ({
      url: `${SITE.url}/rooms/${room.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...facilities.map((facility) => ({
      url: `${SITE.url}/facilities/${facility.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...services.map((service) => ({
      url: `${SITE.url}/services/${service.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
