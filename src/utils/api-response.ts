// src/utils/api-response.ts
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { CustomError, ErrorSeverity } from '@/lib/errors';
import { isUnitOverlapViolation } from '@/lib/hotel/constraints';
import logger from '@/utils/logger';
import type { IPagination } from '@/types/api';

export function successResponse<T>(
  data: T,
  message = 'Success',
  status = 200,
): NextResponse {
  return NextResponse.json({ status: 'success', message, data }, { status });
}

export function paginatedResponse<T>(
  data: T,
  pagination: IPagination,
  message = 'Success',
): NextResponse {
  return NextResponse.json({ status: 'success', message, data, pagination });
}

function isPrismaKnownError(err: unknown): err is { code: string } {
  return (
    !!err &&
    typeof err === 'object' &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string' &&
    (err as { code: string }).code.startsWith('P')
  );
}

/** Maps any thrown value to a safe JSON error response. */
export function handleApiError(err: unknown): NextResponse {
  const isProd = process.env.NODE_ENV === 'production';

  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Validation failed',
        errors: err.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  if (isPrismaKnownError(err)) {
    if (err.code === 'P2002') {
      return NextResponse.json(
        { status: 'error', message: 'A record with that value already exists.' },
        { status: 409 },
      );
    }
    if (err.code === 'P2025') {
      return NextResponse.json(
        { status: 'error', message: 'Resource not found.' },
        { status: 404 },
      );
    }
  }

  // The unit-overlap exclusion constraint is the DB backstop against
  // double-seating a unit; see lib/hotel/constraints.ts for why this needs
  // its own predicate rather than a Prisma error code.
  if (isUnitOverlapViolation(err)) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'This room is no longer available for those dates.',
        code: 'ROOM_NO_LONGER_AVAILABLE',
      },
      { status: 409 },
    );
  }

  if (err instanceof CustomError) {
    // HIGH/CRITICAL typed errors are operational signals, not user slips -
    // log them where the 4xx status would otherwise hide them.
    if (
      err.severity === ErrorSeverity.HIGH ||
      err.severity === ErrorSeverity.CRITICAL
    ) {
      logger.error({ err, code: err.code }, 'High-severity API error');
    }
    return NextResponse.json(
      {
        status: 'error',
        message: err.message,
        // Machine-readable branch point for clients (e.g. the payment
        // verify return page) - present only when the thrower assigned one.
        ...(err.code ? { code: err.code } : {}),
      },
      { status: err.status },
    );
  }

  logger.error({ err }, 'Unhandled API error');
  return NextResponse.json(
    {
      status: 'error',
      message: isProd
        ? 'Internal Server Error'
        : ((err as Error)?.message ?? 'Internal Server Error'),
    },
    { status: 500 },
  );
}
