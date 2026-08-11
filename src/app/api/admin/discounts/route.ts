// src/app/api/admin/discounts/route.ts
import type { NextRequest } from 'next/server';
import type { Prisma } from '@/lib/prisma';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import {
  paginatedResponse,
  successResponse,
  handleApiError,
} from '@/utils/api-response';
import {
  discountCreateSchema,
  discountsQuerySchema,
} from '@/validations/hotel-validation';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const query = discountsQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const where: Prisma.DiscountWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };

    const [discounts, totalItems] = await Promise.all([
      prisma.discount.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { roomType: { select: { id: true, name: true } } },
      }),
      prisma.discount.count({ where }),
    ]);

    return paginatedResponse(discounts, {
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / query.limit),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = discountCreateSchema.parse(await req.json());

    const discount = await prisma.discount.create({
      data: {
        ...input,
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
      },
    });

    return successResponse(discount, 'Discount created', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
