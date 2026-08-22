// src/components/admin/bookings/manual-booking-form.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateFormField } from '@/components/forms/date-form-field';
import { TextField, TextAreaField } from '@/components/forms/text-field';
import { LabeledSelect } from '@/components/forms/labeled-select';
import { optionalPhoneField } from '@/validations/phone-validation';
import {
  dateOnlyString,
  intStringField,
  optionalGhsAmountField,
} from '@/validations/form-primitives';
import { useCreateManualBookingMutation } from '@/redux/bookings-api';
import { useGetRoomTypesQuery } from '@/redux/rooms-api';
import { extractApiError } from '@/lib/extract-api-error';

/** Mirrors validations/hotel-validation.ts (manualBookingSchema). */
const manualFormSchema = z
  .object({
    roomTypeId: z.string().min(1, 'Pick a room'),
    checkIn: dateOnlyString,
    checkOut: dateOnlyString,
    adults: intStringField(1, 20),
    children: intStringField(0, 20),
    guestName: z.string().trim().min(2, "Enter the guest's name").max(50),
    guestEmail: z.email({ message: 'Invalid email format' }),
    guestPhone: optionalPhoneField,
    specialRequests: z.string().trim().max(1000),
    /** GHS; empty = charge the server-computed quote. */
    totalOverride: optionalGhsAmountField('the total'),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: 'Check-out must be after check-in',
    path: ['checkOut'],
  });

type FormInput = z.input<typeof manualFormSchema>;
type FormOutput = z.output<typeof manualFormSchema>;

const BLANK: FormInput = {
  roomTypeId: '',
  checkIn: '',
  checkOut: '',
  adults: '1',
  children: '0',
  guestName: '',
  guestEmail: '',
  guestPhone: '',
  specialRequests: '',
  totalOverride: '',
};

/**
 * Walk-in / phone booking. Created CONFIRMED with no online payment; the
 * server quotes the price (seasons, occupancy, taxes) unless the total
 * is overridden here.
 */
export function ManualBookingForm({
  canOverrideTotal = true,
}: {
  /** Admin-only price override; the API rejects it for FRONT_DESK. */
  canOverrideTotal?: boolean;
}) {
  const router = useRouter();
  const [createBooking, { isLoading }] = useCreateManualBookingMutation();
  const { data: roomTypesData } = useGetRoomTypesQuery({
    page: 1,
    limit: 100,
  });
  const roomOptions = (roomTypesData?.data ?? []).map((rt) => ({
    value: rt.id,
    label: rt.name,
  }));

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(manualFormSchema),
    defaultValues: BLANK,
  });
  const {
    register,
    control,
    formState: { errors },
  } = form;

  const onSubmit = async (data: FormOutput) => {
    try {
      const res = await createBooking({
        roomTypeId: data.roomTypeId,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        adults: data.adults,
        children: data.children,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        specialRequests: data.specialRequests || undefined,
        totalOverride: data.totalOverride,
      }).unwrap();
      toast.success(`Booking ${res.data.code} created`);
      router.push(`/admin/bookings/${res.data.id}`);
    } catch (err) {
      const { message, fieldErrors } = extractApiError(err);
      if (fieldErrors) {
        for (const [field, msg] of Object.entries(fieldErrors)) {
          form.setError(field as keyof FormInput, { message: msg });
        }
      }
      toast.error(message);
    }
  };

  return (
    <div className="border border-border bg-card p-4 sm:p-6">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-5"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Controller
              name="roomTypeId"
              control={control}
              render={({ field }) => (
                <LabeledSelect
                  id="manual-room"
                  label="Room"
                  placeholder="Pick a room…"
                  options={roomOptions}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  error={errors.roomTypeId?.message}
                />
              )}
            />
          </div>
          <Controller
            name="checkIn"
            control={control}
            render={({ field }) => (
              <DateFormField
                id="manual-check-in"
                label="Check-in"
                value={field.value}
                onChange={field.onChange}
                error={errors.checkIn?.message}
              />
            )}
          />
          <Controller
            name="checkOut"
            control={control}
            render={({ field }) => (
              <DateFormField
                id="manual-check-out"
                label="Check-out"
                value={field.value}
                onChange={field.onChange}
                error={errors.checkOut?.message}
              />
            )}
          />
          <TextField
            label="Adults"
            inputMode="numeric"
            error={errors.adults?.message}
            {...register('adults')}
          />
          <TextField
            label="Children"
            inputMode="numeric"
            error={errors.children?.message}
            {...register('children')}
          />
          <TextField
            label="Guest name"
            placeholder="e.g. Ama Mensah"
            error={errors.guestName?.message}
            {...register('guestName')}
          />
          <TextField
            label="Guest email"
            type="email"
            placeholder="guest@example.com"
            error={errors.guestEmail?.message}
            {...register('guestEmail')}
          />
          <TextField
            label="Guest phone (optional)"
            type="tel"
            placeholder="024 123 4567"
            error={errors.guestPhone?.message}
            {...register('guestPhone')}
          />
          {canOverrideTotal && (
            <TextField
              label="Total override (GHS, optional)"
              inputMode="decimal"
              hint="Leave empty to charge the computed price (seasons, taxes, extra guests)."
              error={errors.totalOverride?.message}
              {...register('totalOverride')}
            />
          )}
          <div className="sm:col-span-2">
            <TextAreaField
              label="Special requests (optional)"
              rows={2}
              error={errors.specialRequests?.message}
              {...register('specialRequests')}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/bookings')}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <CalendarPlus />
            )}
            {isLoading ? 'Creating…' : 'Create booking'}
          </Button>
        </div>
      </form>
    </div>
  );
}
