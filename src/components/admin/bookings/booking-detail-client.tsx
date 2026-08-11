// src/components/admin/bookings/booking-detail-client.tsx
'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  Ban,
  CheckCircle2,
  DoorOpen,
  LogOut,
  UserX,
} from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { BackLink } from '@/components/admin/back-link';
import { BookingDetailSkeleton } from '@/components/admin/detail-skeletons';
import { DetailRow, SectionCard } from '@/components/admin/detail-bits';
import { ErrorState } from '@/components/ui/error-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveFormDialog } from '@/components/ui/responsive-form-dialog';
import { LabeledSelect } from '@/components/forms/labeled-select';
import { useConfirm } from '@/hooks/use-confirm';
import {
  useGetBookingQuery,
  useApplyBookingActionMutation,
} from '@/redux/bookings-api';
import { extractApiError } from '@/lib/extract-api-error';
import { formatDate, formatDateTime } from '@/lib/format-date';
import { STAY_TIMES } from '@/config/constants';
import { formatMoney } from '@/lib/format-money';
import { PAYMENT_STATUS_TONE } from '@/lib/status-colors';
import {
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_TONE,
  type BookingActionValue,
  type IBookingDetail,
} from '@/types/booking.types';

const REFUND_OPTIONS = [
  { value: 'policy', label: 'Follow the cancellation policy' },
  { value: 'refund', label: 'Force a full refund' },
  { value: 'none', label: 'No refund' },
];

/** Cancellation with the refund decision and an optional reason. */
function CancelBookingDialog({
  booking,
  open,
  onOpenChange,
}: {
  booking: IBookingDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [applyAction, { isLoading }] = useApplyBookingActionMutation();
  // Mounted fresh per open (the parent renders this only while open), so
  // the fields start clean without any effect-driven reset.
  const [refundChoice, setRefundChoice] = React.useState('policy');
  const [reason, setReason] = React.useState('');

  const handleCancel = async () => {
    try {
      const res = await applyAction({
        id: booking.id,
        action: 'cancel',
        reason: reason.trim() || undefined,
        refund:
          refundChoice === 'policy' ? undefined : refundChoice === 'refund',
      }).unwrap();
      toast.success(res.message ?? 'Booking cancelled');
      onOpenChange(false);
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Cancel ${booking.code}?`}
      description="The unit is freed immediately. Refunds go back through Paystack to the original payment."
      forceDialog
    >
      <div className="space-y-4">
        <LabeledSelect
          id="cancel-refund"
          label="Refund"
          options={REFUND_OPTIONS}
          value={refundChoice}
          onValueChange={setRefundChoice}
        />
        <div className="space-y-1.5">
          <Label htmlFor="cancel-reason">Reason (optional)</Label>
          <Textarea
            id="cancel-reason"
            rows={2}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Guest asked to cancel by phone"
          />
        </div>
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Keep booking
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isLoading}
          >
            <Ban />
            {isLoading ? 'Cancelling…' : 'Cancel booking'}
          </Button>
        </div>
      </div>
    </ResponsiveFormDialog>
  );
}

/** Which transitions each status offers (the server re-checks anyway). */
function actionsFor(
  status: IBookingDetail['status'],
): { action: Exclude<BookingActionValue, 'cancel'>; label: string }[] {
  switch (status) {
    case 'PENDING':
      return [{ action: 'confirm', label: 'Confirm' }];
    case 'CONFIRMED':
      return [
        { action: 'check_in', label: 'Check in' },
        { action: 'no_show', label: 'No show' },
      ];
    case 'CHECKED_IN':
      return [{ action: 'check_out', label: 'Check out' }];
    default:
      return [];
  }
}

const ACTION_ICON = {
  confirm: CheckCircle2,
  check_in: DoorOpen,
  check_out: LogOut,
  no_show: UserX,
} as const;

const ACTION_CONFIRM_COPY: Record<
  Exclude<BookingActionValue, 'cancel'>,
  { title: string; description: string }
> = {
  confirm: {
    title: 'Confirm booking?',
    description:
      'Marks the stay as paid/guaranteed and emails the guest their confirmation.',
  },
  check_in: {
    title: 'Check guest in?',
    description: 'The stay begins and the unit is marked occupied.',
  },
  check_out: {
    title: 'Check guest out?',
    description: 'The stay ends and the unit is freed for housekeeping.',
  },
  no_show: {
    title: 'Mark as no-show?',
    description:
      'The guest never arrived; the unit is freed. This is recorded on the booking.',
  },
};

export function BookingDetailClient({ bookingId }: { bookingId: string }) {
  const { data, isLoading, isError, error, refetch } =
    useGetBookingQuery(bookingId);
  const [applyAction, { isLoading: isActing }] =
    useApplyBookingActionMutation();
  const { confirm, confirmDialog } = useConfirm();
  const [cancelOpen, setCancelOpen] = React.useState(false);

  if (isLoading) return <BookingDetailSkeleton />;

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <BackLink href="/admin/bookings" label="All bookings" />
        <ErrorState
          title="Couldn't load booking"
          description={extractApiError(error).message}
          onRetry={refetch}
        />
      </div>
    );
  }

  const booking = data.data;
  const canCancel =
    booking.status === 'PENDING' || booking.status === 'CONFIRMED';
  const taxLines = Array.isArray(booking.taxBreakdown)
    ? booking.taxBreakdown
    : [];

  const handleAction = async (
    action: Exclude<BookingActionValue, 'cancel'>,
  ) => {
    const copy = ACTION_CONFIRM_COPY[action];
    const ok = await confirm({
      title: copy.title,
      description: copy.description,
      confirmText: copy.title.replace('?', ''),
    });
    if (!ok) return;
    try {
      const res = await applyAction({ id: booking.id, action }).unwrap();
      toast.success(res.message ?? 'Done');
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <BackLink href="/admin/bookings" label="All bookings" />
      <PageHeader
        title={booking.guestName}
        description={`${booking.code} · booked ${formatDateTime(booking.createdAt)}`}
        actions={
          <>
            {actionsFor(booking.status).map(({ action, label }) => {
              const Icon = ACTION_ICON[action];
              return (
                <Button
                  key={action}
                  variant={action === 'no_show' ? 'outline' : 'default'}
                  onClick={() => handleAction(action)}
                  disabled={isActing}
                >
                  <Icon />
                  {label}
                </Button>
              );
            })}
            {canCancel && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setCancelOpen(true)}
                disabled={isActing}
              >
                <Ban />
                Cancel
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 @3xl/main:grid-cols-2">
        <SectionCard title="Stay">
          <div className="divide-y divide-border">
            <DetailRow label="Status">
              <StatusBadge tone={BOOKING_STATUS_TONE[booking.status]}>
                {BOOKING_STATUS_LABEL[booking.status] ?? booking.status}
              </StatusBadge>
            </DetailRow>
            <DetailRow label="Room">
              {booking.roomType?.name ?? 'Room removed'}
            </DetailRow>
            <DetailRow label="Unit">
              {booking.room?.name ?? 'Not assigned'}
            </DetailRow>
            <DetailRow label="Check-in">
              {formatDate(booking.checkIn)} · from {STAY_TIMES.checkInFrom}
            </DetailRow>
            <DetailRow label="Check-out">
              {formatDate(booking.checkOut)} · by {STAY_TIMES.checkOutBy}
            </DetailRow>
            <DetailRow label="Nights">{booking.nights}</DetailRow>
            <DetailRow label="Guests">
              {booking.adults} adult{booking.adults === 1 ? '' : 's'}
              {booking.children > 0 && ` + ${booking.children} children`}
            </DetailRow>
            <DetailRow label="Source">
              {booking.source === 'MANUAL' ? 'Walk-in / phone' : 'Website'}
            </DetailRow>
            {booking.status === 'PENDING' && booking.holdExpiresAt && (
              <DetailRow label="Hold expires">
                {formatDateTime(booking.holdExpiresAt)}
              </DetailRow>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Guest">
          <div className="divide-y divide-border">
            <DetailRow label="Name">{booking.guestName}</DetailRow>
            <DetailRow label="Email">{booking.guestEmail}</DetailRow>
            <DetailRow label="Phone">
              {booking.guestPhone ?? 'Not provided'}
            </DetailRow>
            <DetailRow label="Special requests">
              {booking.specialRequests ?? 'None'}
            </DetailRow>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Charges"
        description="Frozen at booking time - later price changes never touch it."
      >
        <div className="divide-y divide-border">
          <DetailRow label={`Room (${booking.nights} nights)`}>
            {formatMoney(booking.baseAmount, booking.currency)}
          </DetailRow>
          {booking.occupancyAmount > 0 && (
            <DetailRow label="Extra guests">
              {formatMoney(booking.occupancyAmount, booking.currency)}
            </DetailRow>
          )}
          {booking.discountAmount > 0 && (
            <DetailRow
              label={`Discount${booking.discountCode ? ` (${booking.discountCode})` : ''}`}
            >
              -{formatMoney(booking.discountAmount, booking.currency)}
            </DetailRow>
          )}
          {taxLines.map((line, index) => (
            <DetailRow
              key={`${line.name}-${index}`}
              label={`${line.name} (${(line.rateBps / 100).toFixed(1)}%)`}
            >
              {formatMoney(line.amount, booking.currency)}
            </DetailRow>
          ))}
          <DetailRow label="Total">
            <span className="font-semibold">
              {formatMoney(booking.totalAmount, booking.currency)}
            </span>
          </DetailRow>
          {booking.refundedAmount > 0 && (
            <DetailRow label="Refunded">
              {formatMoney(booking.refundedAmount, booking.currency)}
            </DetailRow>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Payments"
        description="The Paystack ledger for this booking."
      >
        {booking.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payments recorded
            {booking.source === 'MANUAL'
              ? ' - walk-in bookings settle at the desk.'
              : ' yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {booking.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-col gap-1.5 py-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                    {payment.reference}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {payment.channel ?? 'card'} ·{' '}
                    {formatDateTime(payment.paidAt ?? payment.createdAt)}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <span className="text-sm font-semibold whitespace-nowrap">
                    {formatMoney(payment.amount, payment.currency)}
                  </span>
                  <StatusBadge
                    tone={PAYMENT_STATUS_TONE[payment.status] ?? 'neutral'}
                  >
                    {payment.status}
                  </StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {cancelOpen && (
        <CancelBookingDialog
          booking={booking}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
        />
      )}
      {confirmDialog}
    </section>
  );
}
