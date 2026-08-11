// src/app/api/admin/facilities/[id]/photos/[photoId]/route.ts
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { deleteImage } from '@/lib/cloudinary';
import { revalidatePublicFacilities } from '@/utils/revalidate';
import { NotFoundError } from '@/middlewares/error-handler';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> },
) {
  try {
    await requireAdmin();
    const { id, photoId } = await params;

    const photo = await prisma.facilityPhoto.findFirst({
      where: { id: photoId, facilityId: id },
      include: { facility: { select: { slug: true } } },
    });
    if (!photo) throw new NotFoundError('Photo not found');

    await prisma.facilityPhoto.delete({ where: { id: photoId } });
    await deleteImage(photo.publicId ?? photo.url);

    revalidatePublicFacilities(photo.facility.slug);
    return successResponse({ id: photoId }, 'Photo deleted');
  } catch (err) {
    return handleApiError(err);
  }
}
