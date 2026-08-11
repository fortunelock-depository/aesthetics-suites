// src/app/api/admin/services/[id]/photos/[photoId]/route.ts
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

    const photo = await prisma.servicePhoto.findFirst({
      where: { id: photoId, serviceId: id },
      include: { service: { select: { slug: true } } },
    });
    if (!photo) throw new NotFoundError('Photo not found');

    await prisma.servicePhoto.delete({ where: { id: photoId } });
    await deleteImage(photo.publicId ?? photo.url);

    revalidatePublicFacilities(photo.service.slug);
    return successResponse({ id: photoId }, 'Photo deleted');
  } catch (err) {
    return handleApiError(err);
  }
}
