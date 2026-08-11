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

type State = 'verifying' | 'success' | 'failed';

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
  const ran = useRef(false);

  const runVerify = useCallback(() => {
    setState('verifying');
    verify({ reference })
      .unwrap()
      .then((res) => {
        if (res.data.status === 'SUCCESS') {
          setState('success');
          onConfirmed?.();
        } else {
          setState('failed');
          setMessage("This payment hasn't been confirmed yet.");
        }
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
          <Button asChild className="mt-6">
            <Link href={routes.home}>Back to home</Link>
          </Button>
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
