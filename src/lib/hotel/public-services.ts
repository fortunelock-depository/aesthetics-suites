// src/lib/hotel/public-services.ts
import 'server-only';
import prisma from '@/lib/prisma';
import logger from '@/utils/logger';

export interface IPublicService {
  id: string;
  slug: string;
  eyebrow: string;
  name: string;
  summary: string;
  description: string[];
  availability: string | null;
  highlights: string[];
  photos: { url: string; alt: string | null }[];
}

const splitParagraphs = (text: string): string[] =>
  text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

/**
 * Published services for the public pages. The DB is the ONLY source of
 * truth: unpublished means not shown; an unreachable DB reads as empty,
 * never a crash.
 */
export async function getPublicServices(): Promise<IPublicService[]> {
  try {
    const services = await prisma.service.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { photos: { orderBy: { sortOrder: 'asc' } } },
    });


    return services.map((service) => ({
      id: service.id,
      slug: service.slug,
      eyebrow: service.eyebrow,
      name: service.name,
      summary: service.summary,
      description: splitParagraphs(service.description),
      availability: service.availability,
      highlights: service.highlights,
      photos: service.photos.map((photo) => ({
        url: photo.url,
        alt: photo.alt,
      })),
    }));
  } catch (error) {
    logger.error({ error }, 'Failed to load public services');
    // Fail soft: an unreachable DB reads as empty, never a crash.
    return [];
  }
}

/** One published service by slug, or null (-> 404). */
export async function getPublicService(
  slug: string,
): Promise<IPublicService | null> {
  const services = await getPublicServices();
  return services.find((service) => service.slug === slug) ?? null;
}
