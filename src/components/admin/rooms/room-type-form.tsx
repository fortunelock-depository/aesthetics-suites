// src/components/admin/rooms/room-type-form.tsx
//
// The one source of truth for room-type form fields, shared by the create
// dialog and the detail page's read-only-until-edit card.
// Inputs hold strings; the schema transforms to the API contract
// (roomTypeCreateSchema) on submit - GHS amounts become integer pesewas,
// numerics become ints, amenity rows become plain strings.
'use client';

import * as React from 'react';
import {
  useFieldArray,
  type UseFieldArrayReturn,
  type UseFormReturn,
} from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldError } from '@/components/forms/field-error';
import { cn } from '@/lib/utils';
import { AMENITY_OPTIONS, amenityIcon } from '@/lib/amenity-icons';
import {
  ghsAmountField,
  intStringField,
  optionalIntStringField,
} from '@/validations/form-primitives';
import type {
  ICreateRoomTypeBody,
  IRoomTypeRow,
} from '@/types/room.types';

/** Input treatment: calm muted fill at rest, alive while editing. */
export const inputCls = (active: boolean) =>
  cn(
    'transition-all duration-200',
    active
      ? 'border-brand/40 bg-background focus:border-brand'
      : 'border-border bg-muted/50 text-foreground',
  );

/** Mirrors validations/hotel-validation.ts (roomTypeCreateSchema). */
export const roomTypeFormSchema = z.object({
  name: z.string().trim().min(2, 'Enter the room name').max(150),
  summary: z.string().trim().min(10, 'At least 10 characters').max(300),
  description: z.string().trim().min(20, 'At least 20 characters').max(10_000),
  basePrice: ghsAmountField('the nightly price', 1),
  capacityAdults: intStringField(1, 20),
  capacityChildren: intStringField(0, 20),
  sizeSqm: optionalIntStringField(1, 10_000),
  baseOccupancy: intStringField(1, 20),
  extraGuestFeePerNight: ghsAmountField('the extra-guest fee', 0),
  freeCancellationDays: intStringField(0, 60),
  minNights: intStringField(1, 90),
  sortOrder: intStringField(0, 10_000),
  airbnbUrl: z.union([
    z.literal('').transform(() => undefined),
    z.url('Enter a valid URL').max(500),
  ]),
  isPublished: z.boolean(),
  amenities: z
    .array(
      z.object({
        value: z.string().trim().min(1, 'Enter the amenity').max(60),
      }),
    )
    .max(50),
  faqs: z
    .array(
      z.object({
        question: z.string().trim().min(5, 'At least 5 characters').max(150),
        answer: z.string().trim().min(5, 'At least 5 characters').max(1000),
      }),
    )
    .max(12),
});

export type RoomTypeFormInput = z.input<typeof roomTypeFormSchema>;
export type RoomTypeFormOutput = z.output<typeof roomTypeFormSchema>;

export const BLANK_ROOM_TYPE: RoomTypeFormInput = {
  name: '',
  summary: '',
  description: '',
  basePrice: '',
  capacityAdults: '2',
  capacityChildren: '0',
  sizeSqm: '',
  baseOccupancy: '2',
  extraGuestFeePerNight: '0',
  freeCancellationDays: '2',
  minNights: '1',
  sortOrder: '0',
  airbnbUrl: '',
  isPublished: false,
  amenities: [],
  faqs: [],
};

const minorToGhsInput = (minor: number): string => String(minor / 100);

/** Saved record -> form field strings, for the detail page's edit card.
 * Array fields are guarded - malformed data must never break the form. */
export function roomTypeToFormDefaults(rt: IRoomTypeRow): RoomTypeFormInput {
  const amenities = Array.isArray(rt.amenities) ? rt.amenities : [];
  const faqs = Array.isArray(rt.faqs)
    ? rt.faqs.filter(
        (f) =>
          f &&
          typeof f.question === 'string' &&
          typeof f.answer === 'string',
      )
    : [];
  return {
    name: rt.name,
    summary: rt.summary,
    description: rt.description,
    basePrice: minorToGhsInput(rt.basePrice),
    capacityAdults: String(rt.capacityAdults),
    capacityChildren: String(rt.capacityChildren),
    sizeSqm: rt.sizeSqm === null ? '' : String(rt.sizeSqm),
    baseOccupancy: String(rt.baseOccupancy),
    extraGuestFeePerNight: minorToGhsInput(rt.extraGuestFeePerNight),
    freeCancellationDays: String(rt.freeCancellationDays),
    minNights: String(rt.minNights),
    sortOrder: String(rt.sortOrder),
    airbnbUrl: rt.airbnbUrl ?? '',
    isPublished: rt.isPublished,
    amenities: amenities.map((value) => ({ value })),
    faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
  };
}

/** Parsed form output -> the API body. */
export function toRoomTypeBody(d: RoomTypeFormOutput): ICreateRoomTypeBody {
  return {
    name: d.name,
    summary: d.summary,
    description: d.description,
    basePrice: d.basePrice,
    capacityAdults: d.capacityAdults,
    capacityChildren: d.capacityChildren,
    sizeSqm: d.sizeSqm,
    amenities: d.amenities.map((a) => a.value),
    faqs: d.faqs,
    airbnbUrl: d.airbnbUrl,
    minNights: d.minNights,
    isPublished: d.isPublished,
    sortOrder: d.sortOrder,
    baseOccupancy: d.baseOccupancy,
    extraGuestFeePerNight: d.extraGuestFeePerNight,
    freeCancellationDays: d.freeCancellationDays,
  };
}

function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      <FieldError message={error} />
    </div>
  );
}

/** Shared props for every field group. */
export interface RoomTypeFieldsProps {
  form: UseFormReturn<RoomTypeFormInput, unknown, RoomTypeFormOutput>;
  /** Drives the muted-at-rest treatment; false disables everything. */
  active: boolean;
  busy: boolean;
}

/** Per-step field names, for the create wizard's step validation. */
export const ROOM_TYPE_STEP_FIELDS = {
  basics: ['name', 'summary', 'description'],
  pricing: [
    'basePrice',
    'capacityAdults',
    'capacityChildren',
    'baseOccupancy',
    'extraGuestFeePerNight',
    'sizeSqm',
    'minNights',
    'freeCancellationDays',
    'sortOrder',
  ],
  extras: ['airbnbUrl', 'amenities', 'faqs'],
} as const satisfies Record<string, readonly (keyof RoomTypeFormInput)[]>;

/** Step 1: identity and copy. */
export function RoomTypeBasicsFields({
  form,
  active,
  busy,
}: RoomTypeFieldsProps) {
  const {
    register,
    formState: { errors },
  } = form;
  const disabled = !active || busy;
  const cls = inputCls(active);

  return (
    <div className="grid grid-cols-1 gap-5">
      <Field id="rt-name" label="Name" error={errors.name?.message}>
        <Input
          id="rt-name"
          placeholder="e.g. Deluxe King Suite"
          disabled={disabled}
          aria-invalid={!!errors.name}
          className={cls}
          {...register('name')}
        />
      </Field>

      <Field
        id="rt-summary"
        label="Summary"
        hint="Short blurb shown on room cards."
        error={errors.summary?.message}
        className="sm:col-span-2"
      >
        <Textarea
          id="rt-summary"
          rows={2}
          disabled={disabled}
          aria-invalid={!!errors.summary}
          className={cls}
          {...register('summary')}
        />
      </Field>

      <Field
        id="rt-description"
        label="Description"
        hint="Full description for the room's detail page."
        error={errors.description?.message}
        className="sm:col-span-2"
      >
        <Textarea
          id="rt-description"
          rows={5}
          disabled={disabled}
          aria-invalid={!!errors.description}
          className={cls}
          {...register('description')}
        />
      </Field>
    </div>
  );
}

/** Step 2: price, occupancy and stay rules. */
export function RoomTypePricingFields({
  form,
  active,
  busy,
}: RoomTypeFieldsProps) {
  const {
    register,
    formState: { errors },
  } = form;
  const disabled = !active || busy;
  const cls = inputCls(active);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Field
        id="rt-base-price"
        label="Nightly price (GHS)"
        error={errors.basePrice?.message}
      >
        <Input
          id="rt-base-price"
          inputMode="decimal"
          placeholder="450.00"
          disabled={disabled}
          aria-invalid={!!errors.basePrice}
          className={cls}
          {...register('basePrice')}
        />
      </Field>

      <Field
        id="rt-adults"
        label="Adults (max)"
        error={errors.capacityAdults?.message}
      >
        <Input
          id="rt-adults"
          inputMode="numeric"
          disabled={disabled}
          aria-invalid={!!errors.capacityAdults}
          className={cls}
          {...register('capacityAdults')}
        />
      </Field>

      <Field
        id="rt-children"
        label="Children (max)"
        error={errors.capacityChildren?.message}
      >
        <Input
          id="rt-children"
          inputMode="numeric"
          disabled={disabled}
          aria-invalid={!!errors.capacityChildren}
          className={cls}
          {...register('capacityChildren')}
        />
      </Field>

      <Field
        id="rt-base-occupancy"
        label="Guests included in price"
        hint="Extras pay the per-night fee."
        error={errors.baseOccupancy?.message}
      >
        <Input
          id="rt-base-occupancy"
          inputMode="numeric"
          disabled={disabled}
          aria-invalid={!!errors.baseOccupancy}
          className={cls}
          {...register('baseOccupancy')}
        />
      </Field>

      <Field
        id="rt-extra-fee"
        label="Extra-guest fee per night (GHS)"
        error={errors.extraGuestFeePerNight?.message}
      >
        <Input
          id="rt-extra-fee"
          inputMode="decimal"
          placeholder="0"
          disabled={disabled}
          aria-invalid={!!errors.extraGuestFeePerNight}
          className={cls}
          {...register('extraGuestFeePerNight')}
        />
      </Field>

      <Field
        id="rt-size"
        label="Size (m², optional)"
        error={errors.sizeSqm?.message}
      >
        <Input
          id="rt-size"
          inputMode="numeric"
          disabled={disabled}
          aria-invalid={!!errors.sizeSqm}
          className={cls}
          {...register('sizeSqm')}
        />
      </Field>

      <Field
        id="rt-min-nights"
        label="Minimum nights"
        error={errors.minNights?.message}
      >
        <Input
          id="rt-min-nights"
          inputMode="numeric"
          disabled={disabled}
          aria-invalid={!!errors.minNights}
          className={cls}
          {...register('minNights')}
        />
      </Field>

      <Field
        id="rt-cancel-days"
        label="Free cancellation (days before check-in)"
        error={errors.freeCancellationDays?.message}
      >
        <Input
          id="rt-cancel-days"
          inputMode="numeric"
          disabled={disabled}
          aria-invalid={!!errors.freeCancellationDays}
          className={cls}
          {...register('freeCancellationDays')}
        />
      </Field>

      <Field
        id="rt-sort"
        label="Sort order"
        hint="Lower numbers list first."
        error={errors.sortOrder?.message}
      >
        <Input
          id="rt-sort"
          inputMode="numeric"
          disabled={disabled}
          aria-invalid={!!errors.sortOrder}
          className={cls}
          {...register('sortOrder')}
        />
      </Field>
    </div>
  );
}

/**
 * Amenities as a checklist of canonical options (each keyword-matches an
 * icon, so icons always line up), plus an advanced free-text add for
 * anything unusual - those get amenityIcon's best guess, or the generic
 * sparkle when nothing matches.
 */
function AmenityChecklist({
  form,
  active,
  busy,
  amenities,
  disabled,
}: RoomTypeFieldsProps & {
  amenities: UseFieldArrayReturn<RoomTypeFormInput, 'amenities'>;
  disabled: boolean;
}) {
  const [customInput, setCustomInput] = React.useState('');
  const selected = form.watch('amenities') ?? [];
  const selectedValues = selected.map((entry) => entry.value);
  const isSelected = (label: string) =>
    selectedValues.some((v) => v.toLowerCase() === label.toLowerCase());
  const customValues = selectedValues.filter(
    (v) =>
      !AMENITY_OPTIONS.some((o) => o.toLowerCase() === v.toLowerCase()),
  );

  const toggle = (label: string) => {
    const index = selectedValues.findIndex(
      (v) => v.toLowerCase() === label.toLowerCase(),
    );
    if (index >= 0) amenities.remove(index);
    else amenities.append({ value: label });
  };

  const removeValue = (value: string) => {
    const index = selectedValues.indexOf(value);
    if (index >= 0) amenities.remove(index);
  };

  const addCustom = () => {
    const value = customInput.trim();
    if (!value) return;
    if (value.length > 60) {
      toast.error('Keep amenity names under 60 characters.');
      return;
    }
    if (selectedValues.some((v) => v.toLowerCase() === value.toLowerCase())) {
      toast.error('That amenity is already on the list.');
      return;
    }
    if (selected.length >= 50) {
      toast.error('That is plenty of amenities already (max 50).');
      return;
    }
    amenities.append({ value });
    setCustomInput('');
  };

  return (
    <div className="space-y-3 sm:col-span-2">
      <div>
        <Label>Amenities</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Check what the room offers - each renders with its matching icon
          on the public page.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-1.5 min-[480px]:grid-cols-2 sm:grid-cols-3">
        {AMENITY_OPTIONS.map((option) => {
          const Icon = amenityIcon(option);
          return (
            <label
              key={option}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 border p-2.5 transition-colors',
                isSelected(option)
                  ? 'border-brand/50 bg-brand/5'
                  : 'border-border',
                disabled && 'cursor-default opacity-70',
              )}
            >
              <Checkbox
                checked={isSelected(option)}
                onCheckedChange={() => toggle(option)}
                disabled={disabled}
                aria-label={option}
              />
              <Icon className="h-4 w-4 flex-none text-brand" aria-hidden />
              <span className="min-w-0 text-sm [overflow-wrap:anywhere]">
                {option}
              </span>
            </label>
          );
        })}
      </div>

      <div className="space-y-2 border border-dashed border-border p-3">
        <p className="text-xs font-medium text-foreground">
          Advanced: custom amenities
        </p>
        <p className="text-xs text-muted-foreground">
          Anything not in the checklist. The icon is best-guessed from the
          name (&quot;plunge pool&quot; gets the pool icon); unmatched
          names get a generic sparkle.
        </p>
        {customValues.length > 0 && (
          <ul className="space-y-1.5">
            {customValues.map((value) => {
              const Icon = amenityIcon(value);
              return (
                <li
                  key={value}
                  className="flex items-center gap-2.5 border border-border px-2.5 py-2"
                >
                  <Icon
                    className="h-4 w-4 flex-none text-brand"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 text-sm [overflow-wrap:anywhere]">
                    {value}
                  </span>
                  {active && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${value}`}
                      className="flex-none text-muted-foreground hover:text-destructive"
                      onClick={() => removeValue(value)}
                      disabled={busy}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {active && (
          <div className="flex gap-2">
            <Input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="e.g. Private plunge pool"
              aria-label="Custom amenity name"
              disabled={busy}
              className={inputCls(true)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addCustom}
              disabled={busy}
              className="flex-none"
            >
              <Plus />
              Add
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Step 3: the listing extras - link-outs, amenities and FAQs. */
export function RoomTypeExtrasFields({
  form,
  active,
  busy,
}: RoomTypeFieldsProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const amenities = useFieldArray({ control, name: 'amenities' });
  const faqs = useFieldArray({ control, name: 'faqs' });
  const disabled = !active || busy;
  const cls = inputCls(active);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Field
        id="rt-airbnb"
        label="Airbnb listing URL (optional)"
        hint='Shown as "View on Airbnb" on the public page.'
        error={errors.airbnbUrl?.message}
        className="sm:col-span-2"
      >
        <Input
          id="rt-airbnb"
          type="url"
          placeholder="https://airbnb.com/rooms/…"
          disabled={disabled}
          aria-invalid={!!errors.airbnbUrl}
          className={cls}
          {...register('airbnbUrl')}
        />
      </Field>

      {/* ---- Amenities ---- */}
      <AmenityChecklist
        form={form}
        active={active}
        busy={busy}
        amenities={amenities}
        disabled={disabled}
      />

      {/* ---- FAQs ---- */}
      <div className="space-y-2 sm:col-span-2">
        <Label>Frequently asked questions</Label>
        {faqs.fields.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {active
              ? 'Shown as the accordion on the room detail page.'
              : 'No FAQs added yet.'}
          </p>
        )}
        <div className="space-y-3">
          {faqs.fields.map((field, index) => (
            <div
              key={field.id}
              className="space-y-2 border border-border p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  FAQ {index + 1}
                </span>
                {active && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove FAQ ${index + 1}`}
                    className="flex-none text-muted-foreground hover:text-destructive"
                    onClick={() => faqs.remove(index)}
                    disabled={busy}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="space-y-1">
                <Input
                  placeholder="Question, e.g. Is breakfast included?"
                  aria-label={`FAQ ${index + 1} question`}
                  disabled={disabled}
                  aria-invalid={!!errors.faqs?.[index]?.question}
                  className={cls}
                  {...register(`faqs.${index}.question`)}
                />
                <FieldError
                  message={errors.faqs?.[index]?.question?.message}
                />
              </div>
              <div className="space-y-1">
                <Textarea
                  rows={2}
                  placeholder="Answer"
                  aria-label={`FAQ ${index + 1} answer`}
                  disabled={disabled}
                  aria-invalid={!!errors.faqs?.[index]?.answer}
                  className={cls}
                  {...register(`faqs.${index}.answer`)}
                />
                <FieldError
                  message={errors.faqs?.[index]?.answer?.message}
                />
              </div>
            </div>
          ))}
        </div>
        {active && faqs.fields.length < 12 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => faqs.append({ question: '', answer: '' })}
            disabled={busy}
          >
            <Plus />
            Add FAQ
          </Button>
        )}
      </div>

    </div>
  );
}

/** The publish toggle - last step of the wizard, inline on the edit card. */
export function RoomTypePublishField({
  form,
  active,
  busy,
}: RoomTypeFieldsProps) {
  const disabled = !active || busy;
  return (
    <label htmlFor="rt-published" className="flex items-center gap-2.5">
      <Checkbox
        id="rt-published"
        checked={form.watch('isPublished')}
        onCheckedChange={(v) =>
          form.setValue('isPublished', v === true, { shouldDirty: true })
        }
        disabled={disabled}
      />
      <span className="text-sm">Published - visible on the public site</span>
    </label>
  );
}

/**
 * Every field group at once - the detail page's read-only-until-edit
 * card. The create wizard renders the groups per step instead.
 */
export function RoomTypeFields(props: RoomTypeFieldsProps) {
  return (
    <div className="space-y-5">
      <RoomTypeBasicsFields {...props} />
      <RoomTypePricingFields {...props} />
      <RoomTypeExtrasFields {...props} />
      <RoomTypePublishField {...props} />
    </div>
  );
}
