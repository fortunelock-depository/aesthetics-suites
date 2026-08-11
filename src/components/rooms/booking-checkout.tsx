// src/components/rooms/booking-checkout.tsx
'use client';

import * as React from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  ArrowRight,
  BadgeCheck,
  CalendarRange,
  Loader2,
  ShieldCheck,
  TicketPercent,
} from 'lucide-react';
import { useGetRoomAvailabilityQuery } from '@/redux/bookings-api';
import { useCreatePublicBookingMutation } from '@/redux/bookings-api';
import { optionalPhoneField } from '@/validations/phone-validation';
import { extractApiError } from '@/lib/extract-api-error';
import { formatDate } from '@/lib/format-date';
import { formatMoney } from '@/lib/format-money';
import { toDateOnlyString } from '@/lib/hotel/dates';
import { cn } from '@/lib/utils';
import type { IPublicRoomDetail } from '@/lib/hotel/public-room-detail';

// Mirrors the guest half of bookingCreateSchema (the API contract); the
// stay half lives in controlled state because it drives the live quote.
const guestSchema = z.object({
  guestName: z.string().trim().min(2, 'Enter your name').max(50),
  guestEmail: z.email({ message: 'Invalid email format' }),
  guestPhone: optionalPhoneField,
  specialRequests: z.string().trim().max(1000),
  /** Honeypot - humans never see it. */
  website: z.string().max(0).optional(),
});

type GuestInput = z.input<typeof guestSchema>;
type GuestOutput = z.output<typeof guestSchema>;

const FIELD =
  'w-full min-w-0 border border-border bg-card px-4 py-3.5 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand aria-[invalid=true]:border-destructive';

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}

function QuoteRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span
        className={cn(
          'min-w-0 text-sm',
          strong ? 'font-semibold text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'flex-none text-sm whitespace-nowrap',
          strong
            ? 'font-heading text-lg font-semibold text-foreground'
            : 'text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * The public checkout: pick the stay (live server quote - the client
 * never computes a price), enter guest details, then hand off to
 * Paystack. The unit is held for 30 minutes while paying.
 */
export function BookingCheckout({
  room,
  initialCheckIn = '',
  initialCheckOut = '',
  initialAdults = 2,
  initialChildren = 0,
}: {
  room: IPublicRoomDetail;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialChildren?: number;
}) {
  const today = toDateOnlyString(new Date());
  const [checkIn, setCheckIn] = React.useState(initialCheckIn);
  const [checkOut, setCheckOut] = React.useState(initialCheckOut);
  const [adults, setAdults] = React.useState(String(initialAdults));
  const [children, setChildren] = React.useState(String(initialChildren));
  const [discountInput, setDiscountInput] = React.useState('');
  const [discountCode, setDiscountCode] = React.useState<string>();
  const [stayError, setStayError] = React.useState<string | null>(null);

  const [createBooking, { isLoading: isBooking }] =
    useCreatePublicBookingMutation();

  const datesValid = Boolean(checkIn && checkOut && checkOut > checkIn);
  const {
    data: quoteData,
    isFetching: isQuoting,
    isError: quoteFailed,
    error: quoteError,
  } = useGetRoomAvailabilityQuery(
    {
      slug: room.slug,
      checkIn,
      checkOut,
      adults: Number(adults),
      children: Number(children),
      discountCode,
    },
    { skip: !datesValid },
  );
  const quote = datesValid ? quoteData?.data : undefined;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<GuestInput, unknown, GuestOutput>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      guestName: '',
      guestEmail: '',
      guestPhone: '',
      specialRequests: '',
      website: '',
    },
  });

  const applyDiscount = () => {
    setDiscountCode(discountInput.trim() || undefined);
  };

  const onSubmit = async (guest: GuestOutput) => {
    if (!datesValid) {
      setStayError('Pick your check-in and check-out dates first.');
      return;
    }
    if (!quote?.available) {
      setStayError('These dates are not available - adjust your stay.');
      return;
    }
    setStayError(null);

    try {
      const res = await createBooking({
        roomTypeSlug: room.slug,
        checkIn,
        checkOut,
        adults: Number(adults),
        children: Number(children),
        guestName: guest.guestName,
        guestEmail: guest.guestEmail,
        guestPhone: guest.guestPhone,
        specialRequests: guest.specialRequests || undefined,
        discountCode,
        website: guest.website,
      }).unwrap();

      if (res.data.authorizationUrl) {
        toast.success('Room held - taking you to secure payment…');
        // Paystack hosts the payment page; it redirects back to
        // /payments/verify when done.
        window.location.assign(res.data.authorizationUrl);
      } else {
        toast.error(
          'The booking was held but payment could not be started. Please contact us with your code: ' +
            (res.data.code ?? ''),
        );
      }
    } catch (err) {
      const { message, fieldErrors } = extractApiError(err);
      if (fieldErrors) {
        for (const [field, msg] of Object.entries(fieldErrors)) {
          if (field in guestSchema.shape) {
            setError(field as keyof GuestInput, { message: msg });
          }
        }
      }
      toast.error(message);
    }
  };

  const cover = room.photos[0];
  const guestOptions = Array.from({ length: 8 }, (_, i) => i + 1);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-8"
    >
      <div className="min-w-0 space-y-10">
        {/* ---- Stay ---- */}
        <section aria-label="Your stay">
          <h2 className="font-heading text-2xl font-medium text-foreground">
            Your Stay
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
            <Field id="book-check-in" label="Check In">
              <input
                id="book-check-in"
                type="date"
                min={today}
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className={FIELD}
              />
            </Field>
            <Field id="book-check-out" label="Check Out">
              <input
                id="book-check-out"
                type="date"
                min={checkIn || today}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className={FIELD}
              />
            </Field>
            <Field id="book-adults" label="Adults">
              <select
                id="book-adults"
                value={adults}
                onChange={(e) => setAdults(e.target.value)}
                className={FIELD}
              >
                {guestOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="book-children" label="Children">
              <select
                id="book-children"
                value={children}
                onChange={(e) => setChildren(e.target.value)}
                className={FIELD}
              >
                {[0, ...guestOptions].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-4 flex gap-2">
            <div className="relative min-w-0 flex-1">
              <TicketPercent className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-brand" />
              <input
                aria-label="Discount code"
                placeholder="Discount code (optional)"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyDiscount();
                  }
                }}
                className={cn(FIELD, 'pl-11')}
              />
            </div>
            <button
              type="button"
              onClick={applyDiscount}
              className="flex-none border border-brand px-5 font-heading text-sm font-bold text-brand uppercase transition-colors hover:bg-brand hover:text-brand-foreground"
            >
              Apply
            </button>
          </div>
          {stayError && (
            <p className="mt-2 text-sm text-destructive">{stayError}</p>
          )}
        </section>

        {/* ---- Guest details ---- */}
        <section aria-label="Guest details">
          <h2 className="font-heading text-2xl font-medium text-foreground">
            Guest Details
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
            <Field
              id="book-name"
              label="Full Name"
              error={errors.guestName?.message}
            >
              <input
                id="book-name"
                autoComplete="name"
                placeholder="e.g. Ama Mensah"
                aria-invalid={!!errors.guestName}
                className={FIELD}
                {...register('guestName')}
              />
            </Field>
            <Field
              id="book-email"
              label="Email"
              error={errors.guestEmail?.message}
            >
              <input
                id="book-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.guestEmail}
                className={FIELD}
                {...register('guestEmail')}
              />
            </Field>
            <div className="min-[480px]:col-span-2">
              <Field
                id="book-phone"
                label="Phone (optional)"
                error={errors.guestPhone?.message}
              >
                <input
                  id="book-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="024 123 4567"
                  aria-invalid={!!errors.guestPhone}
                  className={cn(FIELD, 'max-w-72')}
                  {...register('guestPhone')}
                />
              </Field>
            </div>
            <div className="min-[480px]:col-span-2">
              <Field
                id="book-requests"
                label="Special Requests (optional)"
                error={errors.specialRequests?.message}
              >
                <textarea
                  id="book-requests"
                  rows={3}
                  placeholder="Anything we should prepare for your arrival?"
                  aria-invalid={!!errors.specialRequests}
                  className={FIELD}
                  {...register('specialRequests')}
                />
              </Field>
            </div>
          </div>
          {/* Honeypot - hidden from humans, tempting to bots. */}
          <div aria-hidden className="absolute -left-[9999px]" tabIndex={-1}>
            <label htmlFor="book-website">Website</label>
            <input
              id="book-website"
              tabIndex={-1}
              autoComplete="off"
              {...register('website')}
            />
          </div>
        </section>
      </div>

      {/* ---- Summary (sticky on desktop) ---- */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="border border-border bg-card">
          <div className="relative aspect-[16/9]">
            {cover ? (
              <Image
                src={cover.url}
                alt={cover.alt ?? room.name}
                fill
                sizes="(max-width: 1024px) 100vw, 400px"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-muted" />
            )}
          </div>
          <div className="p-6">
            <h3 className="font-heading text-xl font-medium text-foreground [overflow-wrap:anywhere]">
              {room.name}
            </h3>
            <p className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarRange className="h-4 w-4 flex-none text-brand" />
              {datesValid
                ? `${formatDate(checkIn)} - ${formatDate(checkOut)}`
                : 'Pick your dates'}
            </p>

            <div className="mt-4 border-t border-border">
              {!datesValid ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Your price appears here once you choose check-in and
                  check-out dates.
                </p>
              ) : isQuoting ? (
                <div className="animate-pulse space-y-2 py-4">
                  <div className="h-3.5 w-2/3 bg-muted" />
                  <div className="h-3.5 w-1/2 bg-muted" />
                  <div className="h-5 w-3/4 bg-muted" />
                </div>
              ) : quoteFailed ? (
                <p className="py-4 text-sm text-destructive">
                  {extractApiError(quoteError).message}
                </p>
              ) : !quote ? null : !quote.available ? (
                <p className="py-4 text-sm text-destructive">
                  Not available for these dates
                  {quote.minNights > 1
                    ? ` (minimum stay: ${quote.minNights} nights)`
                    : ''}
                  . Try different dates.
                </p>
              ) : (
                <div className="divide-y divide-border/60">
                  <QuoteRow
                    label={`Room x ${quote.nights} night${quote.nights === 1 ? '' : 's'}`}
                    value={formatMoney(quote.baseAmount, room.currency)}
                  />
                  {quote.occupancyAmount > 0 && (
                    <QuoteRow
                      label="Extra guests"
                      value={formatMoney(
                        quote.occupancyAmount,
                        room.currency,
                      )}
                    />
                  )}
                  {quote.discountAmount > 0 && (
                    <QuoteRow
                      label="Discount"
                      value={`-${formatMoney(quote.discountAmount, room.currency)}`}
                    />
                  )}
                  {(Array.isArray(quote.taxLines) ? quote.taxLines : []).map(
                    (line, index) => (
                      <QuoteRow
                        key={`${line.name}-${index}`}
                        label={line.name}
                        value={formatMoney(line.amount, room.currency)}
                      />
                    ),
                  )}
                  <QuoteRow
                    label="Total"
                    value={formatMoney(quote.totalAmount, room.currency)}
                    strong
                  />
                  {quote.availableUnits <= 2 && (
                    <p className="py-2 text-xs text-brand">
                      Only {quote.availableUnits} unit
                      {quote.availableUnits === 1 ? '' : 's'} left for these
                      dates.
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isBooking || !datesValid || !quote?.available}
              className="btn-sweep btn-sweep-dark mt-4 flex w-full items-center justify-center gap-2.5 bg-brand px-[43px] py-4 font-heading text-base font-bold text-brand-foreground uppercase disabled:pointer-events-none disabled:opacity-50"
            >
              {isBooking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {isBooking ? 'Holding your room…' : 'Book & Pay'}
            </button>

            <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 flex-none text-brand" />
                Secure payment via Paystack.
              </li>
              <li className="flex items-center gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5 flex-none text-brand" />
                Your room is held for 30 minutes while you pay.
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </form>
  );
}
