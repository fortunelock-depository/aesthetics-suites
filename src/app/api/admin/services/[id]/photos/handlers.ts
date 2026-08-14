// src/app/api/admin/services/[id]/photos/handlers.ts
//
// Shared config for the service photo POST/DELETE pair - both route files
// re-export from the factory (see lib/hotel/photo-handlers.ts).
import prisma from '@/lib/prisma';
import { makePhotoHandlers } from '@/lib/hotel/photo-handlers';
import { revalidatePublicServices } from '@/utils/revalidate';

export const servicePhotoHandlers = makePhotoHandlers({
  entityLabel: 'Service',
  folder: 'services',
  findParent: (id) =>
    prisma.service.findFirst({ where: { id }, select: { id: true, slug: true } }),
  lastSortOrder: async (parentId) =>
    (
      await prisma.servicePhoto.findFirst({
        where: { serviceId: parentId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      })
    )?.sortOrder ?? null,
  createPhoto: ({ parentId, ...data }) =>
    prisma.servicePhoto.create({ data: { serviceId: parentId, ...data } }),
  findPhoto: async (parentId, photoId) => {
    const photo = await prisma.servicePhoto.findFirst({
      where: { id: photoId, serviceId: parentId },
      include: { service: { select: { slug: true } } },
    });
    return photo
      ? { publicId: photo.publicId, url: photo.url, parentSlug: photo.service.slug }
      : null;
  },
  deletePhoto: (photoId) => prisma.servicePhoto.delete({ where: { id: photoId } }),
  revalidate: revalidatePublicServices,
});
