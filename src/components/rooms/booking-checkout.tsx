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
  CalendarCheck,
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
import { DatePlaceholder } from '@/components/ui/date-placeholder';
import { CTA_BUTTON, FIELD } from './field-styles';
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

/** Stay-level errors ("pick your dates", "not available") announce here. */
const STAY_ERROR_ID = 'book-stay-error';

/**
 * The room's free-cancellation window. Zero means the room has no free
 * window, so the line is left off rather than promising nothing.
 */
function freeCancellationDays(room: IPublicRoomDetail): number | null {
  return room.freeCancellationDays > 0 ? room.freeCancellationDays : null;
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactElement<{ 'aria-describedby'?: string }>;
}) {
  // The error is programmatically tied to the input: aria-describedby is
  // injected onto the child so screen readers announce WHY it is invalid,
  // and role="alert" announces the message the moment it appears.
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-muted-foreground"
      >
        {label}
      </label>
      {React.cloneElement(children, { 'aria-describedby': errorId })}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function QuoteRow({
  label,
  value,
  strong,
  className,
}: {
  label: string;
  value: string;
  /** The total: the one figure the guest is deciding on. */
  strong?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 py-2',
        strong && 'items-baseline pt-3',
        className,
      )}
    >
      <span
        className={cn(
          'min-w-0 text-sm',
          strong ? 'font-medium text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'flex-none text-sm whitespace-nowrap',
          strong
            ? 'font-heading text-2xl leading-none font-light tracking-[-0.01em] text-foreground'
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
  const [adults, setAdults] = React.useState(
    String(Math.min(Math.max(initialAdults, 1), room.capacityAdults)),
  );
  const [children, setChildren] = React.useState(
    String(Math.min(Math.max(initialChildren, 0), room.capacityChildren)),
  );
  const [discountInput, setDiscountInput] = React.useState('');
  const [discountCode, setDiscountCode] = React.useState<string>();
  const [stayError, setStayError] = React.useState<string | null>(null);
  // Missing dates park the guest here rather than greying the CTA out.
  const checkInRef = React.useRef<HTMLInputElement>(null);

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

  // Guest-field errors are reported by react-hook-form; a missing stay is
  // not one of its fields, so it says its piece here too.
  const onInvalid = () => {
    if (!datesValid) {
      setStayError('Pick your check-in and check-out dates first.');
    }
  };

  const applyDiscount = () => {
    setDiscountCode(discountInput.trim() || undefined);
  };

  const onSubmit = async (guest: GuestOutput) => {
    if (!datesValid) {
      setStayError('Pick your check-in and check-out dates first.');
      checkInRef.current?.focus();
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
  const freeDays = freeCancellationDays(room);
  // Options end at the room's actual capacity - offering 8 adults on a
  // 2-adult room just walks the guest into a failed quote.
  const adultOptions = Array.from(
    { length: Math.max(room.capacityAdults, 1) },
    (_, i) => i + 1,
  );
  const childOptions = Array.from(
    { length: room.capacityChildren + 1 },
    (_, i) => i,
  );

  return (
    <form
      // Bound on submit rather than during render: onSubmit reaches for
      // the check-in field's ref, which render must never touch.
      onSubmit={(event) => handleSubmit(onSubmit, onInvalid)(event)}
      noValidate
      className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-8"
    >
      <div className="min-w-0 space-y-10">
        {/* ---- Stay ---- */}
        <section aria-label="Your stay">
          <h2 className="font-heading text-2xl font-light tracking-[-0.01em] text-foreground">
            Your stay
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
            <Field id="book-check-in" label="Check in">
              <DatePlaceholder value={checkIn} placeholder="Add check-in date">
                <input
                  id="book-check-in"
                  ref={checkInRef}
                  type="date"
                  aria-describedby={stayError ? STAY_ERROR_ID : undefined}
                  aria-invalid={stayError ? true : undefined}
                  min={today}
                  value={checkIn}
                  onChange={(e) => {
                    setCheckIn(e.target.value);
                    // A stale "pick your dates" complaint must not outlive
                    // its fix; the fresh quote speaks next.
                    setStayError(null);
                  }}
                  className={FIELD}
                />
              </DatePlaceholder>
            </Field>
            <Field id="book-check-out" label="Check out">
              <DatePlaceholder value={checkOut} placeholder="Add check-out date">
                <input
                  id="book-check-out"
                  type="date"
                  aria-describedby={stayError ? STAY_ERROR_ID : undefined}
                  aria-invalid={stayError ? true : undefined}
                  min={checkIn || today}
                  value={checkOut}
                  onChange={(e) => {
                    setCheckOut(e.target.value);
                    setStayError(null);
                  }}
                  className={FIELD}
                />
              </DatePlaceholder>
            </Field>
            <Field id="book-adults" label="Adults">
              <select
                id="book-adults"
                value={adults}
                onChange={(e) => setAdults(e.target.value)}
                className={FIELD}
              >
                {adultOptions.map((n) => (
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
                {childOptions.map((n) => (
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
              className="flex-none border border-brand px-5 text-[13px] font-medium tracking-[0.14em] text-brand-text uppercase transition-colors hover:bg-brand hover:text-brand-foreground"
            >
              Apply
            </button>
          </div>
          {stayError && (
            <p
              id={STAY_ERROR_ID}
              role="alert"
              className="mt-2 text-sm text-destructive"
            >
              {stayError}
            </p>
          )}
        </section>

        {/* ---- Guest details ---- */}
        <section aria-label="Guest details">
          <h2 className="font-heading text-2xl font-light tracking-[-0.01em] text-foreground">
            Guest details
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
            <Field
              id="book-name"
              label="Full name"
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
                label="Special requests (optional)"
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
            <h3 className="font-heading text-xl font-normal tracking-[-0.01em] text-foreground [overflow-wrap:anywhere]">
              {room.name}
            </h3>
            <p className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarRange className="h-4 w-4 flex-none text-brand" />
              {datesValid
                ? `${formatDate(checkIn)} - ${formatDate(checkOut)}`
                : 'Pick your dates'}
            </p>

            {/* Live region: this panel swaps between loading, unavailable,
                quote-failed and priced as the dates change. Without an
                announcement a screen-reader guest can watch a suite become
                unavailable and hear nothing. */}
            <div
              className="mt-4 border-t border-border"
              aria-live="polite"
              aria-busy={isQuoting || undefined}
            >
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
                    label={`${quote.nights} night${quote.nights === 1 ? '' : 's'}`}
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
                    className="border-t border-brand"
                  />
                  {quote.availableUnits <= 2 && (
                    <p className="py-2 text-xs text-brand-text">
                      Only {quote.availableUnits} suite
                      {quote.availableUnits === 1 ? '' : 's'} left for these
                      dates.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Never greyed out for missing dates: a dead button explains
                nothing. Pressing without a stay sends the guest back to the
                check-in field with the reason spoken aloud. */}
            <button
              type="submit"
              disabled={isBooking}
              className={cn(
                CTA_BUTTON,
                'btn-sweep-dark mt-4 w-full bg-brand text-brand-foreground disabled:pointer-events-none',
              )}
            >
              {isBooking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {isBooking ? 'Holding your suite…' : 'Reserve and pay'}
            </button>

            <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 flex-none text-brand" />
                Secure payment via Paystack.
              </li>
              <li className="flex items-center gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5 flex-none text-brand" />
                Your suite is held for 30 minutes while you pay.
              </li>
              {freeDays !== null && (
                <li className="flex items-center gap-1.5">
                  <CalendarCheck className="h-3.5 w-3.5 flex-none text-brand" />
                  Free cancellation until {freeDays} day
                  {freeDays === 1 ? '' : 's'} before check-in.
                </li>
              )}
            </ul>
          </div>
        </div>
      </aside>
    </form>
  );
}
