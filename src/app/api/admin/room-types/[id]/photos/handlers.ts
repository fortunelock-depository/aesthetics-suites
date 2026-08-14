// src/app/api/admin/room-types/[id]/photos/handlers.ts
//
// Shared config for the room-type photo POST/DELETE pair - both route
// files re-export from the factory (see lib/hotel/photo-handlers.ts).
import prisma from '@/lib/prisma';
import { makePhotoHandlers } from '@/lib/hotel/photo-handlers';
import { revalidatePublicRooms } from '@/utils/revalidate';

export const roomTypePhotoHandlers = makePhotoHandlers({
  entityLabel: 'Room type',
  folder: 'rooms',
  findParent: (id) =>
    prisma.roomType.findFirst({ where: { id }, select: { id: true, slug: true } }),
  lastSortOrder: async (parentId) =>
    (
      await prisma.roomPhoto.findFirst({
        where: { roomTypeId: parentId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      })
    )?.sortOrder ?? null,
  createPhoto: ({ parentId, ...data }) =>
    prisma.roomPhoto.create({ data: { roomTypeId: parentId, ...data } }),
  findPhoto: async (parentId, photoId) => {
    const photo = await prisma.roomPhoto.findFirst({
      where: { id: photoId, roomTypeId: parentId },
      include: { roomType: { select: { slug: true } } },
    });
    return photo
      ? { publicId: photo.publicId, url: photo.url, parentSlug: photo.roomType.slug }
      : null;
  },
  deletePhoto: (photoId) => prisma.roomPhoto.delete({ where: { id: photoId } }),
  revalidate: revalidatePublicRooms,
});
