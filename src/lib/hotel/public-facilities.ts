// src/lib/hotel/public-facilities.ts
import 'server-only';
import prisma from '@/lib/prisma';
import logger from '@/utils/logger';

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

/**
 * Published facilities for the public pages. The DB is the ONLY source of
 * truth: unpublished means not shown; an unreachable DB reads as empty,
 * never a crash.
 */
export async function getPublicFacilities(): Promise<IPublicFacility[]> {
  try {
    const facilities = await prisma.facility.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { photos: { orderBy: { sortOrder: 'asc' } } },
    });


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
    // Fail soft: an unreachable DB reads as empty, never a crash.
    return [];
  }
}

/** One published facility by slug, or null (-> 404). */
export async function getPublicFacility(
  slug: string,
): Promise<IPublicFacility | null> {
  const facilities = await getPublicFacilities();
  return facilities.find((facility) => facility.slug === slug) ?? null;
}
