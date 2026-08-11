// src/app/api/admin/room-types/[id]/photos/[photoId]/route.ts
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { deleteImage } from '@/lib/cloudinary';
import { revalidatePublicRooms } from '@/utils/revalidate';
import { NotFoundError } from '@/middlewares/error-handler';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> },
) {
  try {
    await requireAdmin();
    const { id, photoId } = await params;

    const photo = await prisma.roomPhoto.findFirst({
      where: { id: photoId, roomTypeId: id },
      include: { roomType: { select: { slug: true } } },
    });
    if (!photo) throw new NotFoundError('Photo not found');

    await prisma.roomPhoto.delete({ where: { id: photoId } });
    // Best-effort Cloudinary cleanup (never blocks the delete).
    await deleteImage(photo.publicId ?? photo.url);

    revalidatePublicRooms(photo.roomType.slug);
    return successResponse({ id: photoId }, 'Photo deleted');
  } catch (err) {
    return handleApiError(err);
  }
}
