// src/app/api/admin/room-types/[id]/photos/route.ts
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { fileToUploaded } from '@/lib/uploads';
import { uploadImage } from '@/lib/cloudinary';
import { revalidatePublicRooms } from '@/utils/revalidate';
import {
  NotFoundError,
  ValidationError,
} from '@/middlewares/error-handler';

/**
 * Adds gallery photos (multipart form, field `photos`, one or many files).
 * The client stages files through FileUploadField (already downscaled);
 * this is the authoritative size/type gate before Cloudinary.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const roomType = await prisma.roomType.findFirst({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!roomType) throw new NotFoundError('Room type not found');

    const form = await req.formData();
    const files = form.getAll('photos');
    if (files.length === 0) {
      throw new ValidationError('Attach at least one photo.');
    }

    const alt = form.get('alt');
    const last = await prisma.roomPhoto.findFirst({
      where: { roomTypeId: id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    let sortOrder = (last?.sortOrder ?? -1) + 1;

    const created = [];
    for (const file of files) {
      const uploaded = await fileToUploaded(file, 'room photo');
      if (!uploaded) continue;
      const result = await uploadImage(uploaded, { folder: 'rooms' });
      created.push(
        await prisma.roomPhoto.create({
          data: {
            roomTypeId: id,
            url: result.secure_url,
            publicId: result.public_id,
            alt: typeof alt === 'string' && alt ? alt : undefined,
            sortOrder: sortOrder++,
          },
        }),
      );
    }

    revalidatePublicRooms(roomType.slug);
    return successResponse(created, 'Photos uploaded', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
