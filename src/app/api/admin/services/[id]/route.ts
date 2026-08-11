// src/app/api/admin/services/[id]/route.ts
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { serviceUpdateSchema } from '@/validations/hotel-validation';
import { generateSlug } from '@/utils/generate-slug';
import { revalidatePublicFacilities } from '@/utils/revalidate';
import { NotFoundError } from '@/middlewares/error-handler';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const service = await prisma.service.findFirst({
      where: { id },
      include: { photos: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!service) throw new NotFoundError('Service not found');

    return successResponse(service);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const input = serviceUpdateSchema.parse(await req.json());

    const existing = await prisma.service.findFirst({
      where: { id },
      select: { slug: true },
    });
    if (!existing) throw new NotFoundError('Service not found');

    const service = await prisma.service.update({
      where: { id },
      data: {
        ...input,
        ...(input.name ? { slug: generateSlug(input.name) } : {}),
      },
    });

    revalidatePublicFacilities(existing.slug);
    if (service.slug !== existing.slug) {
      revalidatePublicFacilities(service.slug);
    }
    return successResponse(service, 'Service updated');
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.service.findFirst({
      where: { id },
      select: { slug: true },
    });
    if (!existing) throw new NotFoundError('Service not found');

    await prisma.service.delete({ where: { id } });
    revalidatePublicFacilities(existing.slug);
    return successResponse({ id }, 'Service deleted');
  } catch (err) {
    return handleApiError(err);
  }
}
