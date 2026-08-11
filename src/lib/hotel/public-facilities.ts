// src/lib/hotel/public-facilities.ts
import 'server-only';
import prisma from '@/lib/prisma';
import logger from '@/utils/logger';
import { FACILITIES } from '@/static-data/home';

export interface IPublicFacility {
  id: string;
  slug: string;
  eyebrow: string;
  name: string;
  summary: string;
  description: string[];
  openingHours: string | null;
  highlights: string[];
  photos: { url: string; alt: string | null }[];
}

const splitParagraphs = (text: string): string[] =>
  text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

/** The static editorial facilities, shaped like the DB payload. */
export const STATIC_FACILITIES: IPublicFacility[] = FACILITIES.map(
  (facility, index) => ({
    id: `static-${index}`,
    slug: facility.slug,
    eyebrow: facility.eyebrow,
    name: facility.title,
    summary: facility.description,
    description: [...facility.longDescription],
    openingHours: facility.openingHours,
    highlights: [...facility.highlights],
    photos: [
      { url: facility.image.src, alt: facility.image.alt },
      ...facility.gallery.map((photo) => ({
        url: photo.src,
        alt: photo.alt,
      })),
    ],
  }),
);

/**
 * Published facilities for the public pages. Fails SOFT to the static
 * editorial set, so the site always shows facilities - before the DB has
 * any, and during outages.
 */
export async function getPublicFacilities(): Promise<IPublicFacility[]> {
  try {
    const facilities = await prisma.facility.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { photos: { orderBy: { sortOrder: 'asc' } } },
    });

    if (facilities.length === 0) return STATIC_FACILITIES;

    return facilities.map((facility) => ({
      id: facility.id,
      slug: facility.slug,
      eyebrow: facility.eyebrow,
      name: facility.name,
      summary: facility.summary,
      description: splitParagraphs(facility.description),
      openingHours: facility.openingHours,
      highlights: facility.highlights,
      photos: facility.photos.map((photo) => ({
        url: photo.url,
        alt: photo.alt,
      })),
    }));
  } catch (error) {
    logger.error({ error }, 'Failed to load public facilities');
    return STATIC_FACILITIES;
  }
}

/** One facility by slug (DB first, static fallback), or null. */
export async function getPublicFacility(
  slug: string,
): Promise<IPublicFacility | null> {
  const facilities = await getPublicFacilities();
  return facilities.find((facility) => facility.slug === slug) ?? null;
}
