// src/app/api/admin/facilities/[id]/photos/route.ts
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { fileToUploaded } from '@/lib/uploads';
import { uploadImage } from '@/lib/cloudinary';
import { revalidatePublicFacilities } from '@/utils/revalidate';
import { NotFoundError, ValidationError } from '@/middlewares/error-handler';

/** Adds facility photos (multipart form, field `photos`, first = cover). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const facility = await prisma.facility.findFirst({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!facility) throw new NotFoundError('Facility not found');

    const form = await req.formData();
    const files = form.getAll('photos');
    if (files.length === 0) {
      throw new ValidationError('Attach at least one photo.');
    }

    const alt = form.get('alt');
    const last = await prisma.facilityPhoto.findFirst({
      where: { facilityId: id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    let sortOrder = (last?.sortOrder ?? -1) + 1;

    const created = [];
    for (const file of files) {
      const uploaded = await fileToUploaded(file, 'facility photo');
      if (!uploaded) continue;
      const result = await uploadImage(uploaded, { folder: 'facilities' });
      created.push(
        await prisma.facilityPhoto.create({
          data: {
            facilityId: id,
            url: result.secure_url,
            publicId: result.public_id,
            alt: typeof alt === 'string' && alt ? alt : undefined,
            sortOrder: sortOrder++,
          },
        }),
      );
    }

    revalidatePublicFacilities(facility.slug);
    return successResponse(created, 'Photos uploaded', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
