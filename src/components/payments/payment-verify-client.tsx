// src/components/payments/payment-verify-client.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CircleCheck, CircleX, Loader2 } from 'lucide-react';
import { CtaLink, ctaClasses } from '@/components/site/cta-link';
import { EYEBROW } from '@/components/site/section-heading';
import { useVerifyPaymentMutation } from '@/redux/payments-api';
import { extractApiError } from '@/lib/extract-api-error';
import { formatMoney } from '@/lib/format-money';
import { formatDateTime } from '@/lib/format-date';
import { routes } from '@/lib/routes';

type State =
  | 'verifying'
  | 'success'
  | 'processing'
  | 'refunded'
  | 'refund_pending'
  | 'failed';

/** What the verified payment tells the guest about their stay. */
interface Receipt {
  code: string;
  guestEmail: string;
  /** Minor units (pesewas). */
  amount: number;
  currency: string;
  paidAt: string | null;
}

// The CtaLink treatment carried on a <button>: re-verifying stays on this
// page, so these actions cannot be links.
const RETRY_BUTTON = ctaClasses({ sweep: 'light' });

const HEADING =
  'font-heading text-[26px] leading-[1.2] font-light tracking-[-0.01em] text-foreground sm:text-[30px]';
const BODY = 'mx-auto mt-3 max-w-sm text-[15px] leading-[26px] text-muted-foreground';
const ACTIONS = 'mt-8 flex flex-wrap items-center justify-center gap-3';

function bookingHref({ code, guestEmail }: Receipt) {
  return `${routes.bookings}?code=${encodeURIComponent(code)}&email=${encodeURIComponent(guestEmail)}`;
}

/** The stay's paper trail: what the guest should keep or quote back to us. */
function ReceiptSummary({
  receipt,
  reference,
}: {
  receipt: Receipt;
  reference: string;
}) {
  const rows: { label: string; value: string }[] = [
    { label: 'Booking code', value: receipt.code },
    {
      label: 'Amount paid',
      value: formatMoney(receipt.amount, receipt.currency),
    },
    ...(receipt.paidAt
      ? [{ label: 'Paid', value: formatDateTime(receipt.paidAt) }]
      : []),
    { label: 'Reference', value: reference },
  ];

  return (
    <dl className="mt-8 border-t border-border text-left">
      {rows.map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border py-3"
        >
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="text-[15px] font-medium text-foreground [overflow-wrap:anywhere]">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The Paystack return page body. Paystack appends BOTH `reference` and
 * `trxref` (same value); we verify once on mount, and a transient failure
 * right after a mobile redirect gets a "Try again" button instead of a
 * dead end. Booking-specific wrappers can pass `onConfirmed` for side
 * effects (e.g. clearing a draft booking).
 */
export function PaymentVerifyClient({
  onConfirmed,
}: {
  onConfirmed?: () => void;
}) {
  const params = useSearchParams();
  const reference = params.get('reference') ?? params.get('trxref') ?? '';

  const [verify] = useVerifyPaymentMutation();
  // Seeded from the URL - no setState-in-effect for the missing-ref case.
  const [state, setState] = useState<State>(reference ? 'verifying' : 'failed');
  const [message, setMessage] = useState(
    reference ? '' : 'This link is missing its payment reference.',
  );
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const ran = useRef(false);

  const runVerify = useCallback(() => {
    setState('verifying');
    verify({ reference })
      .unwrap()
      .then((res) => {
        const paidBooking = res.data.booking;
        const paid: Receipt | null = paidBooking
          ? {
              code: paidBooking.code,
              guestEmail: paidBooking.guestEmail,
              amount: res.data.amount,
              currency: res.data.currency,
              paidAt: res.data.paidAt,
            }
          : null;
        // Branch on the server-resolved outcome, never on the raw payment
        // status: an auto-refunded charge arrives here already REVERSED,
        // so a status check would call it "not confirmed" while a refund
        // is in flight.
        if (res.data.outcome === 'refunded') {
          setState('refunded');
          return;
        }
        if (res.data.outcome === 'refund_pending') {
          setState('refund_pending');
          return;
        }
        // Money landed but the booking is not finalised yet. Never show
        // this as failed (they paid) or as confirmed (the stay is not
        // secured); "Try again" re-verifies and usually resolves it.
        if (res.data.outcome === 'processing') {
          if (paid) setReceipt(paid);
          setState('processing');
          return;
        }
        if (res.data.outcome !== 'confirmed') {
          setState('failed');
          setMessage("This payment hasn't been confirmed yet.");
          return;
        }
        if (paid) setReceipt(paid);
        setState('success');
        onConfirmed?.();
      })
      .catch((err) => {
        setState('failed');
        setMessage(extractApiError(err).message);
      });
  }, [reference, verify, onConfirmed]);

  useEffect(() => {
    if (ran.current || !reference) return;
    ran.current = true;
    runVerify();
  }, [reference, runVerify]);

  return (
    // The page swaps between six outcomes in place after an async check, so
    // the region announces itself: without this a guest using a screen reader
    // hears "Confirming your payment" and then silence, with no way to know
    // whether the charge succeeded. aria-atomic reads the whole outcome, not
    // just the words that changed.
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy={state === 'verifying'}
      className="mx-auto w-full max-w-lg border border-border bg-card px-6 py-10 text-center sm:px-10"
    >
      {state === 'verifying' && (
        <>
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-brand" />
          <h1 className={`mt-6 ${HEADING}`}>Confirming your payment</h1>
          <p className={BODY}>This usually takes a few seconds.</p>
        </>
      )}

      {state === 'success' && (
        <>
          <CircleCheck
            className="mx-auto h-11 w-11 text-brand"
            strokeWidth={1.25}
          />
          <p className={`mt-6 ${EYEBROW}`}>Paid</p>
          <h1 className={`mt-3 ${HEADING}`}>Booking confirmed</h1>
          <p className={BODY}>
            {receipt
              ? `Your suite is held. The confirmation is on its way to ${receipt.guestEmail}.`
              : 'Your payment went through. The confirmation is on its way to you by email.'}
          </p>
          {receipt && (
            <ReceiptSummary receipt={receipt} reference={reference} />
          )}
          <div className={ACTIONS}>
            {receipt && (
              <CtaLink href={bookingHref(receipt)}>View my booking</CtaLink>
            )}
            <CtaLink
              href={routes.home}
              variant={receipt ? 'outline' : 'solid'}
              sweep={receipt ? 'gold' : 'light'}
            >
              Back to home
            </CtaLink>
          </div>
        </>
      )}

      {state === 'processing' && (
        <>
          <Loader2
            className="mx-auto h-11 w-11 animate-spin text-brand"
            strokeWidth={1.25}
          />
          <h1 className={`mt-6 ${HEADING}`}>Payment received</h1>
          <p className={BODY}>
            We have your money and are still confirming the reservation. This
            normally settles within a few minutes and you will get a
            confirmation email. If anything needs attention our team is
            alerted automatically.
          </p>
          <p className="mt-4 text-sm text-muted-foreground [overflow-wrap:anywhere]">
            Reference: {reference}
          </p>
          <div className={ACTIONS}>
            <button type="button" onClick={runVerify} className={RETRY_BUTTON}>
              Check again
            </button>
            {receipt && (
              <CtaLink
                href={bookingHref(receipt)}
                variant="outline"
                sweep="gold"
              >
                View my booking
              </CtaLink>
            )}
          </div>
        </>
      )}

      {state === 'refunded' && (
        <>
          <CircleX
            className="mx-auto h-11 w-11 text-destructive"
            strokeWidth={1.25}
          />
          <h1 className={`mt-6 ${HEADING}`}>The suite was taken</h1>
          <p className={BODY}>
            Your payment arrived after the reservation hold expired and the
            room has since been booked. A refund has been sent back to your
            payment method, and our team has been notified.
          </p>
          <div className={ACTIONS}>
            <CtaLink href={routes.rooms}>View other suites</CtaLink>
          </div>
        </>
      )}

      {state === 'refund_pending' && (
        <>
          <CircleX
            className="mx-auto h-11 w-11 text-destructive"
            strokeWidth={1.25}
          />
          <h1 className={`mt-6 ${HEADING}`}>The suite was taken</h1>
          <p className={BODY}>
            Your payment arrived after the reservation hold expired and the
            room has since been booked. We could not return the money
            automatically, so our team has been alerted and will sort out
            your refund. Please keep the reference below.
          </p>
          <p className="mt-4 text-sm text-muted-foreground [overflow-wrap:anywhere]">
            Reference: {reference}
          </p>
          <div className={ACTIONS}>
            <CtaLink href={routes.contact}>Reach us</CtaLink>
            <CtaLink href={routes.rooms} variant="outline" sweep="gold">
              View other suites
            </CtaLink>
          </div>
        </>
      )}

      {state === 'failed' && (
        <>
          <CircleX
            className="mx-auto h-11 w-11 text-destructive"
            strokeWidth={1.25}
          />
          <h1 className={`mt-6 ${HEADING}`}>Payment not confirmed</h1>
          <p className={`${BODY} [overflow-wrap:anywhere]`}>{message}</p>
          <div className={ACTIONS}>
            {reference && (
              <button
                type="button"
                onClick={runVerify}
                className={RETRY_BUTTON}
              >
                Try again
              </button>
            )}
            <CtaLink
              href={routes.home}
              variant={reference ? 'outline' : 'solid'}
              sweep={reference ? 'gold' : 'light'}
            >
              Back to home
            </CtaLink>
          </div>
        </>
      )}
    </div>
  );
}
