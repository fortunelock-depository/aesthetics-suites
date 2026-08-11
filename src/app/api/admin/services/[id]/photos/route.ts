// src/app/api/admin/services/[id]/photos/route.ts
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { fileToUploaded } from '@/lib/uploads';
import { uploadImage } from '@/lib/cloudinary';
import { revalidatePublicFacilities } from '@/utils/revalidate';
import { NotFoundError, ValidationError } from '@/middlewares/error-handler';

/** Adds service photos (multipart form, field `photos`, first = cover). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const service = await prisma.service.findFirst({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!service) throw new NotFoundError('Service not found');

    const form = await req.formData();
    const files = form.getAll('photos');
    if (files.length === 0) {
      throw new ValidationError('Attach at least one photo.');
    }

    const alt = form.get('alt');
    const last = await prisma.servicePhoto.findFirst({
      where: { serviceId: id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    let sortOrder = (last?.sortOrder ?? -1) + 1;

    const created = [];
    for (const file of files) {
      const uploaded = await fileToUploaded(file, 'service photo');
      if (!uploaded) continue;
      const result = await uploadImage(uploaded, { folder: 'services' });
      created.push(
        await prisma.servicePhoto.create({
          data: {
            serviceId: id,
            url: result.secure_url,
            publicId: result.public_id,
            alt: typeof alt === 'string' && alt ? alt : undefined,
            sortOrder: sortOrder++,
          },
        }),
      );
    }

    revalidatePublicFacilities(service.slug);
    return successResponse(created, 'Photos uploaded', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
