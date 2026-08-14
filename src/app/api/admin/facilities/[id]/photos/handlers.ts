// src/app/api/admin/facilities/[id]/photos/handlers.ts
//
// Shared config for the facility photo POST/DELETE pair - both route files
// re-export from the factory (see lib/hotel/photo-handlers.ts).
import prisma from '@/lib/prisma';
import { makePhotoHandlers } from '@/lib/hotel/photo-handlers';
import { revalidatePublicFacilities } from '@/utils/revalidate';

export const facilityPhotoHandlers = makePhotoHandlers({
  entityLabel: 'Facility',
  folder: 'facilities',
  findParent: (id) =>
    prisma.facility.findFirst({ where: { id }, select: { id: true, slug: true } }),
  lastSortOrder: async (parentId) =>
    (
      await prisma.facilityPhoto.findFirst({
        where: { facilityId: parentId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      })
    )?.sortOrder ?? null,
  createPhoto: ({ parentId, ...data }) =>
    prisma.facilityPhoto.create({ data: { facilityId: parentId, ...data } }),
  findPhoto: async (parentId, photoId) => {
    const photo = await prisma.facilityPhoto.findFirst({
      where: { id: photoId, facilityId: parentId },
      include: { facility: { select: { slug: true } } },
    });
    return photo
      ? { publicId: photo.publicId, url: photo.url, parentSlug: photo.facility.slug }
      : null;
  },
  deletePhoto: (photoId) => prisma.facilityPhoto.delete({ where: { id: photoId } }),
  revalidate: revalidatePublicFacilities,
});
