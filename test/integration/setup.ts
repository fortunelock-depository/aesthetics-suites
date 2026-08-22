// test/integration/setup.ts
//
// Per-worker setup for the real-database suite: mocks the network seams
// (Paystack, outbound booking email), silences logging, and truncates every
// table before each test so cases are fully isolated.
import { afterAll, beforeEach, vi } from 'vitest';

// ── Paystack fake ───────────────────────────────────────────────────────────
// Echoes the amount/currency `initialize` was called with (keyed by
// reference), so the service's amount-reconciliation check runs for real.
// Tests can override any call with
// vi.mocked(...).mockXxxOnce and read `paystackCharged` to inspect charges.
const paystackState = vi.hoisted(() => ({
  charged: new Map<string, { amount: number; currency: string }>(),
}));

export const paystackCharged = paystackState.charged;

vi.mock('@/lib/paystack/client', () => ({
  initializePaystackTransaction: vi.fn(
    (params: { amount: number; currency?: string; reference: string }) => {
      paystackState.charged.set(params.reference, {
        amount: params.amount,
        currency: params.currency ?? 'GHS',
      });
      return Promise.resolve({
        authorizationUrl: `https://paystack.test/pay/${params.reference}`,
        accessCode: 'acc_test',
        reference: params.reference,
      });
    },
  ),
  verifyPaystackTransaction: vi.fn((reference: string) => {
    const charge = paystackState.charged.get(reference);
    // Verifying a reference this test never initialized means the fixture
    // is wrong (the map is cleared per test). Defaulting to amount 0 would
    // quietly trip the mismatch branch and read as a real failure, so fail
    // where the mistake is instead.
    if (!charge) {
      return Promise.reject(
        new Error(
          `Paystack fake: reference "${reference}" was never initialized in this test. ` +
            'Create the charge inside the test, or override verifyPaystackTransaction explicitly.',
        ),
      );
    }
    return Promise.resolve({
      status: 'success',
      amount: charge.amount,
      currency: charge.currency,
      reference,
      paidAt: '2026-01-01T00:00:00.000Z',
      channel: 'card',
      customerEmail: 'guest@test.local',
    });
  }),
  refundPaystackTransaction: vi.fn(() => Promise.resolve()),
  // Real implementation, not a stub: it is pure message-text matching, and
  // the refund-retry path depends on classifying "already refunded" as
  // settlement rather than failure. Stubbing it false would hide that.
  isAlreadyRefunded: (error: unknown) =>
    /already|fully revers|fully refund/i.test(
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : '',
    ),
}));

// ── Booking email fake ──────────────────────────────────────────────────────
// The whole sender module is faked so no test touches SMTP and lifecycle
// tests can count sends per email kind.
vi.mock('@/lib/mail/booking-emails', () => ({
  sendBookingConfirmedEmail: vi.fn(() => Promise.resolve()),
  sendCompletePaymentEmail: vi.fn(() => Promise.resolve()),
  sendBookingCancelledEmail: vi.fn(() => Promise.resolve()),
  sendBookingNotificationToAdmins: vi.fn(() => Promise.resolve()),
  sendPaymentReconciliationAlert: vi.fn(() => Promise.resolve()),
  sendPreArrivalEmail: vi.fn(() => Promise.resolve()),
  sendReviewInviteEmail: vi.fn(() => Promise.resolve()),
}));

// ── Booking-code seam ───────────────────────────────────────────────────────
// Wraps the real generator in a spy so the collision-retry test can force a
// duplicate code with mockReturnValueOnce while every other test gets real
// random codes.
vi.mock('@/utils/codes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/codes')>();
  return {
    ...actual,
    generateBookingCode: vi.fn(actual.generateBookingCode),
  };
});

// Silence application logging (the services log settle/reconcile events).
vi.mock('@/utils/logger', () => {
  const noop = vi.fn();
  const logger = {
    debug: noop,
    error: noop,
    fatal: noop,
    info: noop,
    trace: noop,
    warn: noop,
    child: vi.fn(() => logger),
  };
  return { default: logger };
});

import prisma from '@/lib/prisma';

let cachedTables: string[] | null = null;

async function getTables(): Promise<string[]> {
  if (cachedTables) return cachedTables;
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  cachedTables = rows.map((row) => row.tablename);
  return cachedTables;
}

export async function resetDatabase(): Promise<void> {
  const tables = await getTables();
  if (tables.length === 0) return;
  const list = tables.map((table) => `"public"."${table}"`).join(', ');
  const sql = `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`;

  // Fire-and-forget writes from the previous test can still hold row locks
  // while TRUNCATE wants an AccessExclusiveLock - a transient deadlock.
  // Retry with backoff; Postgres aborts one side, so a later attempt wins.
  for (let attempt = 0; ; attempt++) {
    try {
      await prisma.$executeRawUnsafe(sql);
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt < 8 && message.includes('deadlock')) {
        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
}

beforeEach(async () => {
  await resetDatabase();
  paystackState.charged.clear();
  // Resets call history. Base implementations set by vi.mock survive; any
  // queued -Once override is expected to be consumed by the test that
  // queued it, so nothing here relies on those being discarded.
  vi.clearAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});
