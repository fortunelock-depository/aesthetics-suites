// src/app/api/admin/reviews/[id]/route.ts
import prisma, { ReviewStatus } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { reviewModerateSchema } from '@/validations/hotel-validation';
import { revalidatePublicRooms } from '@/utils/revalidate';
import { NotFoundError } from '@/middlewares/error-handler';

/** Approve/reject a review; approval makes it live under the listing. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const { action } = reviewModerateSchema.parse(await req.json());

    const existing = await prisma.review.findFirst({
      where: { id },
      include: { roomType: { select: { slug: true } } },
    });
    if (!existing) throw new NotFoundError('Review not found');

    const review = await prisma.review.update({
      where: { id },
      data: {
        status:
          action === 'approve'
            ? ReviewStatus.APPROVED
            : ReviewStatus.REJECTED,
        moderatedById: session.userId,
        moderatedAt: new Date(),
      },
    });

    revalidatePublicRooms(existing.roomType.slug);
    return successResponse(review, `Review ${action}d`);
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

    const existing = await prisma.review.findFirst({
      where: { id },
      include: { roomType: { select: { slug: true } } },
    });
    if (!existing) throw new NotFoundError('Review not found');

    await prisma.review.delete({ where: { id } });
    revalidatePublicRooms(existing.roomType.slug);
    return successResponse({ id }, 'Review deleted');
  } catch (err) {
    return handleApiError(err);
  }
}
