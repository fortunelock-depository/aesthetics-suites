// src/components/payments/payment-verify-client.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CircleCheck, CircleX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVerifyPaymentMutation } from '@/redux/payments-api';
import { extractApiError } from '@/lib/extract-api-error';
import { routes } from '@/lib/routes';

type State =
  | 'verifying'
  | 'success'
  | 'processing'
  | 'refunded'
  | 'refund_pending'
  | 'failed';

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
  const [booking, setBooking] = useState<{
    code: string;
    guestEmail: string;
  } | null>(null);
  const ran = useRef(false);

  const runVerify = useCallback(() => {
    setState('verifying');
    verify({ reference })
      .unwrap()
      .then((res) => {
        const paidBooking = res.data.booking;
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
          if (paidBooking) {
            setBooking({
              code: paidBooking.code,
              guestEmail: paidBooking.guestEmail,
            });
          }
          setState('processing');
          return;
        }
        if (res.data.outcome !== 'confirmed') {
          setState('failed');
          setMessage("This payment hasn't been confirmed yet.");
          return;
        }
        if (paidBooking) {
          setBooking({
            code: paidBooking.code,
            guestEmail: paidBooking.guestEmail,
          });
        }
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
    <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card px-6 py-10 text-center">
      {state === 'verifying' && (
        <>
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <h1 className="mt-4 text-lg font-semibold">Confirming your payment…</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This usually takes a few seconds.
          </p>
        </>
      )}

      {state === 'success' && (
        <>
          <CircleCheck className="mx-auto h-10 w-10 text-brand" />
          <h1 className="mt-4 text-lg font-semibold">Payment confirmed</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Thank you - your payment went through successfully.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {booking && (
              <Button asChild>
                <Link
                  href={`${routes.bookings}?code=${encodeURIComponent(booking.code)}&email=${encodeURIComponent(booking.guestEmail)}`}
                >
                  View my booking
                </Link>
              </Button>
            )}
            <Button asChild variant={booking ? 'outline' : 'default'}>
              <Link href={routes.home}>Back to home</Link>
            </Button>
          </div>
        </>
      )}

      {state === 'processing' && (
        <>
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand" />
          <h1 className="mt-4 text-lg font-semibold">
            Payment received - finalising your booking
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We have your payment and are still confirming the reservation.
            This normally settles within a few minutes and you will get a
            confirmation email. If anything needs attention our team is
            alerted automatically.
          </p>
          <p className="mt-3 text-xs text-muted-foreground [overflow-wrap:anywhere]">
            Reference: {reference}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={runVerify}>Check again</Button>
            {booking && (
              <Button asChild variant="outline">
                <Link
                  href={`${routes.bookings}?code=${encodeURIComponent(booking.code)}&email=${encodeURIComponent(booking.guestEmail)}`}
                >
                  View my booking
                </Link>
              </Button>
            )}
          </div>
        </>
      )}

      {state === 'refunded' && (
        <>
          <CircleX className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-lg font-semibold">
            Payment received - room no longer available
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your payment arrived after the reservation hold expired and the
            room has since been taken. A refund has been initiated to your
            payment method, and our team has been notified.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href={routes.rooms}>Browse other rooms</Link>
          </Button>
        </>
      )}

      {state === 'refund_pending' && (
        <>
          <CircleX className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-lg font-semibold">
            Payment received - room no longer available
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your payment arrived after the reservation hold expired and the
            room has since been taken. We could not return the money
            automatically, so our team has been alerted and will sort out
            your refund. Please keep your payment reference.
          </p>
          <p className="mt-3 text-xs text-muted-foreground [overflow-wrap:anywhere]">
            Reference: {reference}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline">
              <Link href={routes.contact}>Contact us</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={routes.rooms}>Browse other rooms</Link>
            </Button>
          </div>
        </>
      )}

      {state === 'failed' && (
        <>
          <CircleX className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-lg font-semibold">
            Payment not confirmed
          </h1>
          <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {message}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {reference && <Button onClick={runVerify}>Try again</Button>}
            <Button asChild variant="outline">
              <Link href={routes.home}>Back to home</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
