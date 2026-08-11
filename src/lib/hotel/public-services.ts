// src/lib/hotel/public-services.ts
import 'server-only';
import prisma from '@/lib/prisma';
import logger from '@/utils/logger';
import { SERVICES } from '@/static-data/home';

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

/** The static editorial services, shaped like the DB payload. */
export const STATIC_SERVICES: IPublicService[] = SERVICES.map(
  (service, index) => ({
    id: `static-${index}`,
    slug: service.slug,
    eyebrow: service.eyebrow,
    name: service.title,
    summary: service.description,
    description: [...service.longDescription],
    availability: service.availability,
    highlights: [...service.highlights],
    photos: [
      { url: service.image.src, alt: service.image.alt },
      ...service.gallery.map((photo) => ({
        url: photo.src,
        alt: photo.alt,
      })),
    ],
  }),
);

/**
 * Published services for the public pages. Fails SOFT to the static
 * editorial set, so the site always shows services - before the DB has
 * any, and during outages.
 */
export async function getPublicServices(): Promise<IPublicService[]> {
  try {
    const services = await prisma.service.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { photos: { orderBy: { sortOrder: 'asc' } } },
    });

    if (services.length === 0) return STATIC_SERVICES;

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
    return STATIC_SERVICES;
  }
}

/** One service by slug (DB first, static fallback), or null. */
export async function getPublicService(
  slug: string,
): Promise<IPublicService | null> {
  const services = await getPublicServices();
  return services.find((service) => service.slug === slug) ?? null;
}
