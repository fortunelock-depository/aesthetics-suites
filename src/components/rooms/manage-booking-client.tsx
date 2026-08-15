// src/components/rooms/manage-booking-client.tsx
'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  ArrowRight,
  Ban,
  CalendarRange,
  CreditCard,
  Loader2,
  Search,
  Users,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useLazyGetGuestBookingQuery,
  usePayGuestBookingMutation,
  useCancelGuestBookingMutation,
} from '@/redux/bookings-api';
import { extractApiError } from '@/lib/extract-api-error';
import { formatDate, formatDateTime } from '@/lib/format-date';
import { formatMoney } from '@/lib/format-money';
import { STAY_TIMES } from '@/config/constants';
import { cn } from '@/lib/utils';
import {
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_TONE,
  type IGuestBooking,
} from '@/types/booking.types';
import { bookRoom } from '@/lib/routes';

const FIELD =
  'w-full min-w-0 border border-border bg-card px-4 py-3.5 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand';

function StayRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-2.5 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
      <span className="flex-none text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 text-sm text-foreground [overflow-wrap:anywhere] min-[480px]:text-right">
        {children}
      </span>
    </div>
  );
}

const STATUS_COPY: Record<IGuestBooking['status'], string> = {
  PENDING:
    'Your room is held - complete payment before the hold expires to confirm your stay.',
  CONFIRMED: 'You are all set - we look forward to hosting you.',
  CHECKED_IN: 'Enjoy your stay! The front desk is available around the clock.',
  CHECKED_OUT: 'Thanks for staying with us - we hope to see you again.',
  CANCELLED: 'This booking was cancelled.',
  NO_SHOW: 'This booking was marked as a no-show.',
  EXPIRED:
    'The payment hold expired, so this booking was released. You can book the room again.',
};

/**
 * Guest self-service: look a booking up by code + email, see its status,
 * resume an unfinished payment, or cancel under the policy.
 */
export function ManageBookingClient({
  initialCode = '',
  initialEmail = '',
}: {
  /** Prefill from the complete-payment email's one-click link. */
  initialCode?: string;
  initialEmail?: string;
} = {}) {
  const [code, setCode] = React.useState(initialCode.toUpperCase());
  const [email, setEmail] = React.useState(initialEmail);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = React.useState(false);

  const [lookup, { data, isFetching, isError, error, fulfilledTimeStamp }] =
    useLazyGetGuestBookingQuery();

  // Arriving from the email link: both halves present -> look up at once.
  React.useEffect(() => {
    if (initialCode && initialEmail.includes('@')) {
      lookup({ code: initialCode.toUpperCase().trim(), email: initialEmail.trim() });
    }
  }, [initialCode, initialEmail, lookup]);
  const [payBooking, { isLoading: isPaying }] = usePayGuestBookingMutation();
  const [cancelBooking, { isLoading: isCancelling }] =
    useCancelGuestBookingMutation();

  const booking = data?.data;
  const identity = { code: code.trim(), email: email.trim() };

  const handleLookup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!identity.code || !identity.email.includes('@')) {
      setFormError('Enter your booking code and the email you booked with.');
      return;
    }
    setFormError(null);
    lookup(identity);
  };

  const handlePay = async () => {
    try {
      const res = await payBooking(identity).unwrap();
      if (res.data.authorizationUrl) {
        toast.success('Taking you to secure payment…');
        window.location.assign(res.data.authorizationUrl);
      } else {
        toast.error('Payment could not be started - please contact us.');
      }
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  const handleCancel = async () => {
    try {
      const res = await cancelBooking(identity).unwrap();
      toast.success(res.message ?? 'Booking cancelled.');
      setCancelOpen(false);
      lookup(identity);
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  // Compared against when the lookup RESOLVED (render must stay pure);
  // the pay endpoint re-checks the hold authoritatively anyway.
  const lookedUpAt = fulfilledTimeStamp ?? 0;
  const holdActive =
    booking?.status === 'PENDING' &&
    (!booking.holdExpiresAt ||
      new Date(booking.holdExpiresAt).getTime() > lookedUpAt);
  const canCancel =
    booking?.status === 'PENDING' || booking?.status === 'CONFIRMED';

  return (
    <div className="mx-auto w-full max-w-xl">
      <form onSubmit={handleLookup} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
          <div>
            <label
              htmlFor="manage-code"
              className="mb-1.5 block text-sm font-medium text-muted-foreground"
            >
              Booking Code
            </label>
            <input
              id="manage-code"
              placeholder="e.g. ASB-20260810-4F2A"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className={FIELD}
              maxLength={30}
            />
          </div>
          <div>
            <label
              htmlFor="manage-email"
              className="mb-1.5 block text-sm font-medium text-muted-foreground"
            >
              Email
            </label>
            <input
              id="manage-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD}
              maxLength={255}
            />
          </div>
        </div>
        {formError && (
          <p className="text-sm text-destructive">{formError}</p>
        )}
        <button
          type="submit"
          disabled={isFetching}
          className="btn-sweep btn-sweep-dark flex w-full items-center justify-center gap-2.5 bg-brand px-[43px] py-4 font-heading text-base font-bold text-brand-foreground uppercase disabled:pointer-events-none disabled:opacity-50"
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {isFetching ? 'Looking up…' : 'Find My Booking'}
        </button>
      </form>

      {isError && (
        <p className="mt-6 border border-dashed border-border bg-card px-5 py-4 text-center text-sm text-muted-foreground">
          {extractApiError(error).message}
        </p>
      )}

      {booking && !isFetching && (
        <div className="mt-8 border border-border bg-card p-6">
          <div className="flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
            <p className="min-w-0 font-heading text-lg font-medium text-foreground [overflow-wrap:anywhere]">
              {booking.roomType.name}
            </p>
            <StatusBadge
              tone={BOOKING_STATUS_TONE[booking.status] ?? 'neutral'}
              className="self-start min-[480px]:self-auto"
            >
              {BOOKING_STATUS_LABEL[booking.status] ?? booking.status}
            </StatusBadge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {STATUS_COPY[booking.status] ?? ''}
          </p>

          <div className="mt-4 divide-y divide-border border-t border-border">
            <StayRow label="Booking code">{booking.code}</StayRow>
            <StayRow label="Guest">{booking.guestName}</StayRow>
            <StayRow label="Check-in">
              <span className="inline-flex items-center gap-1.5">
                <CalendarRange
                  className="h-3.5 w-3.5 flex-none text-brand"
                  aria-hidden
                />
                {formatDate(booking.checkIn)} · from {STAY_TIMES.checkInFrom}
              </span>
            </StayRow>
            <StayRow label="Check-out">
              {formatDate(booking.checkOut)} · by {STAY_TIMES.checkOutBy}
            </StayRow>
            <StayRow label="Guests">
              <span className="inline-flex items-center gap-1.5">
                <Users
                  className="h-3.5 w-3.5 flex-none text-brand"
                  aria-hidden
                />
                {booking.adults} adult{booking.adults === 1 ? '' : 's'}
                {booking.children > 0 && ` + ${booking.children} children`}
              </span>
            </StayRow>
            <StayRow label="Total">
              <span className="font-semibold">
                {formatMoney(booking.totalAmount, booking.currency)}
              </span>
            </StayRow>
            {holdActive && booking.holdExpiresAt && (
              <StayRow label="Hold expires">
                {formatDateTime(booking.holdExpiresAt)}
              </StayRow>
            )}
          </div>

          {(holdActive || canCancel) && (
            <div
              className={cn(
                'mt-5 flex flex-col gap-2',
                holdActive && 'min-[480px]:flex-row',
              )}
            >
              {holdActive && (
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={isPaying}
                  className="btn-sweep btn-sweep-dark flex flex-1 items-center justify-center gap-2.5 bg-brand px-6 py-3.5 font-heading text-sm font-bold text-brand-foreground uppercase disabled:pointer-events-none disabled:opacity-50"
                >
                  {isPaying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  {isPaying ? 'Starting payment…' : 'Complete Payment'}
                </button>
              )}
              {canCancel && (
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  disabled={isCancelling}
                  className="flex flex-1 items-center justify-center gap-2 border border-border px-6 py-3.5 font-heading text-sm font-bold text-muted-foreground uppercase transition-colors hover:border-destructive hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                >
                  <Ban className="h-4 w-4" />
                  Cancel Booking
                </button>
              )}
            </div>
          )}

          {booking.status === 'EXPIRED' && (
            <a
              href={bookRoom(booking.roomType.slug)}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-text hover:underline"
            >
              Book this room again
              <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>
      )}

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel your booking?"
        description="Our cancellation policy decides the refund: cancelling inside the free-cancellation window refunds you in full; outside it, the payment is not refunded."
        confirmText="Cancel booking"
        isDestructive
        loading={isCancelling}
        onConfirm={handleCancel}
      />
    </div>
  );
}
