// src/components/admin/rooms/create-room-type-wizard.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DetailRow } from '@/components/admin/detail-bits';
import { useCreateRoomTypeMutation } from '@/redux/rooms-api';
import { extractApiError } from '@/lib/extract-api-error';
import { formatMoney } from '@/lib/format-money';
import { cn } from '@/lib/utils';
import {
  BLANK_ROOM_TYPE,
  ROOM_TYPE_STEP_FIELDS,
  RoomTypeBasicsFields,
  RoomTypeExtrasFields,
  RoomTypePricingFields,
  RoomTypePublishField,
  roomTypeFormSchema,
  toRoomTypeBody,
  type RoomTypeFormInput,
  type RoomTypeFormOutput,
} from './room-type-form';

const STEPS = [
  { key: 'basics', title: 'Basics', blurb: 'Name and the copy guests read.' },
  {
    key: 'pricing',
    title: 'Pricing & capacity',
    blurb: 'Nightly price, occupancy and stay rules.',
  },
  {
    key: 'extras',
    title: 'Amenities & FAQs',
    blurb: 'What the room offers, and the questions guests ask.',
  },
  {
    key: 'review',
    title: 'Review & publish',
    blurb: 'Check everything, then create the room.',
  },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

function StepHeader({ current }: { current: number }) {
  return (
    <div>
      <ol className="flex items-center gap-2">
        {STEPS.map((step, index) => {
          const done = index < current;
          const isCurrent = index === current;
          return (
            <li key={step.key} className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className={cn(
                  'grid h-8 w-8 flex-none place-items-center rounded-full border text-sm font-semibold transition-colors',
                  done && 'border-brand bg-brand text-brand-foreground',
                  isCurrent &&
                    'border-brand text-brand',
                  !done && !isCurrent && 'border-border text-muted-foreground',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  'hidden min-w-0 truncate text-sm md:block',
                  isCurrent
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {step.title}
              </span>
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    'h-px flex-1',
                    done ? 'bg-brand' : 'bg-border',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-muted-foreground md:hidden">
        Step {current + 1} of {STEPS.length}: {STEPS[current].title}
      </p>
    </div>
  );
}

/** The review step: everything entered, as calm key/value rows. */
function ReviewStep({
  values,
}: {
  values: RoomTypeFormInput;
}) {
  const price = Number(values.basePrice);
  return (
    <div className="divide-y divide-border">
      <DetailRow label="Name">{values.name}</DetailRow>
      <DetailRow label="Summary">{values.summary}</DetailRow>
      <DetailRow label="Nightly price">
        {Number.isFinite(price) ? formatMoney(Math.round(price * 100)) : '-'}
      </DetailRow>
      <DetailRow label="Sleeps">
        {values.capacityAdults} adult{values.capacityAdults === '1' ? '' : 's'}
        {Number(values.capacityChildren) > 0 &&
          ` + ${values.capacityChildren} children`}
      </DetailRow>
      <DetailRow label="Guests included in price">
        {values.baseOccupancy}
      </DetailRow>
      <DetailRow label="Minimum nights">{values.minNights}</DetailRow>
      <DetailRow label="Free cancellation">
        {values.freeCancellationDays} day
        {values.freeCancellationDays === '1' ? '' : 's'} before check-in
      </DetailRow>
      <DetailRow label="Amenities">
        {values.amenities.length > 0
          ? values.amenities.map((a) => a.value).join(', ')
          : 'None yet'}
      </DetailRow>
      <DetailRow label="FAQs">
        {values.faqs.length > 0
          ? `${values.faqs.length} question${values.faqs.length === 1 ? '' : 's'}`
          : 'None yet'}
      </DetailRow>
      <DetailRow label="Airbnb link">
        {values.airbnbUrl || 'Not linked'}
      </DetailRow>
    </div>
  );
}

/**
 * Room creation as a four-step wizard on its own page (long forms never
 * go in dialogs). Each step validates before advancing; photos and units
 * are added on the room's page afterwards.
 */
export function CreateRoomTypeWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [createRoomType, { isLoading }] = useCreateRoomTypeMutation();

  const form = useForm<RoomTypeFormInput, unknown, RoomTypeFormOutput>({
    resolver: zodResolver(roomTypeFormSchema),
    defaultValues: BLANK_ROOM_TYPE,
  });

  const stepKey: StepKey = STEPS[step].key;

  const handleNext = async () => {
    if (stepKey !== 'review') {
      const valid = await form.trigger(
        // Readonly tuples -> the mutable array trigger expects.
        [...ROOM_TYPE_STEP_FIELDS[stepKey]],
        { shouldFocus: true },
      );
      if (!valid) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const onSubmit = async (data: RoomTypeFormOutput) => {
    try {
      const res = await createRoomType(toRoomTypeBody(data)).unwrap();
      toast.success('Room created - now add photos and units.');
      router.push(`/admin/rooms/${res.data.id}`);
    } catch (err) {
      const { message, fieldErrors } = extractApiError(err);
      if (fieldErrors) {
        for (const [field, msg] of Object.entries(fieldErrors)) {
          form.setError(field as keyof RoomTypeFormInput, { message: msg });
        }
      }
      toast.error(message);
    }
  };

  return (
    <div className="@container border border-border bg-card p-4 sm:p-6">
      <StepHeader current={step} />

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="mt-6 space-y-5"
      >
        <div>
          <h3 className="font-semibold">{STEPS[step].title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {STEPS[step].blurb}
          </p>
        </div>

        {/* Hidden steps stay MOUNTED so field state survives Back/Next. */}
        <div className={stepKey === 'basics' ? undefined : 'hidden'}>
          <RoomTypeBasicsFields form={form} active busy={isLoading} />
        </div>
        <div className={stepKey === 'pricing' ? undefined : 'hidden'}>
          <RoomTypePricingFields form={form} active busy={isLoading} />
        </div>
        <div className={stepKey === 'extras' ? undefined : 'hidden'}>
          <RoomTypeExtrasFields form={form} active busy={isLoading} />
        </div>
        {stepKey === 'review' && (
          <div className="space-y-5">
            <ReviewStep values={form.watch()} />
            <RoomTypePublishField form={form} active busy={isLoading} />
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              step === 0 ? router.push('/admin/rooms') : setStep(step - 1)
            }
            disabled={isLoading}
          >
            <ArrowLeft />
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {stepKey !== 'review' ? (
            <Button type="button" onClick={handleNext} disabled={isLoading}>
              Next
              <ArrowRight />
            </Button>
          ) : (
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <BedDouble />
              )}
              {isLoading ? 'Creating…' : 'Create room'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
