// src/app/api/admin/facilities/[id]/route.ts
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { facilityUpdateSchema } from '@/validations/hotel-validation';
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

    const facility = await prisma.facility.findFirst({
      where: { id },
      include: { photos: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!facility) throw new NotFoundError('Facility not found');

    return successResponse(facility);
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
    const input = facilityUpdateSchema.parse(await req.json());

    const existing = await prisma.facility.findFirst({
      where: { id },
      select: { slug: true },
    });
    if (!existing) throw new NotFoundError('Facility not found');

    const facility = await prisma.facility.update({
      where: { id },
      data: {
        ...input,
        ...(input.name ? { slug: generateSlug(input.name) } : {}),
      },
    });

    revalidatePublicFacilities(existing.slug);
    if (facility.slug !== existing.slug) {
      revalidatePublicFacilities(facility.slug);
    }
    return successResponse(facility, 'Facility updated');
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

    const existing = await prisma.facility.findFirst({
      where: { id },
      select: { slug: true },
    });
    if (!existing) throw new NotFoundError('Facility not found');

    await prisma.facility.delete({ where: { id } });
    revalidatePublicFacilities(existing.slug);
    return successResponse({ id }, 'Facility deleted');
  } catch (err) {
    return handleApiError(err);
  }
}
