// src/components/admin/facilities/facility-form.tsx
//
// The one source of truth for facility form fields, shared by the create
// page and the detail page's read-only-until-edit card. Inputs hold
// strings; the schema parses to the API contract (facilityCreateSchema)
// on submit.
'use client';

import * as React from 'react';
import {
  useFieldArray,
  type UseFormReturn,
} from 'react-hook-form';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldError } from '@/components/forms/field-error';
import { intStringField } from '@/validations/form-primitives';
import { cn } from '@/lib/utils';
import type {
  ICreateFacilityBody,
  IFacilityRow,
} from '@/types/facility.types';

/** Input treatment: calm muted fill at rest, alive while editing. */
const inputCls = (active: boolean) =>
  cn(
    'transition-all duration-200',
    active
      ? 'border-brand/40 bg-background focus:border-brand'
      : 'border-border bg-muted/50 text-foreground',
  );

/** Mirrors validations/hotel-validation.ts (facilityCreateSchema). */
export const facilityFormSchema = z.object({
  name: z.string().trim().min(2, 'Enter the facility name').max(80),
  eyebrow: z.string().trim().min(2, 'Enter the eyebrow line').max(60),
  summary: z.string().trim().min(10, 'At least 10 characters').max(300),
  description: z.string().trim().min(20, 'At least 20 characters').max(10_000),
  openingHours: z.string().trim().max(120),
  sortOrder: intStringField(0, 10_000),
  isPublished: z.boolean(),
  highlights: z
    .array(
      z.object({
        value: z.string().trim().min(2, 'At least 2 characters').max(60),
      }),
    )
    .max(12),
});

export type FacilityFormInput = z.input<typeof facilityFormSchema>;
export type FacilityFormOutput = z.output<typeof facilityFormSchema>;

export const BLANK_FACILITY: FacilityFormInput = {
  name: '',
  eyebrow: '',
  summary: '',
  description: '',
  openingHours: '',
  sortOrder: '0',
  isPublished: false,
  highlights: [],
};

/** Saved record -> form field strings; arrays guarded (fail-safe rule). */
export function facilityToFormDefaults(
  facility: IFacilityRow,
): FacilityFormInput {
  const highlights = Array.isArray(facility.highlights)
    ? facility.highlights
    : [];
  return {
    name: facility.name,
    eyebrow: facility.eyebrow,
    summary: facility.summary,
    description: facility.description,
    openingHours: facility.openingHours ?? '',
    sortOrder: String(facility.sortOrder),
    isPublished: facility.isPublished,
    highlights: highlights.map((value) => ({ value })),
  };
}

/** Parsed form output -> the API body ('' clears openingHours on update). */
export function toFacilityBody(d: FacilityFormOutput): ICreateFacilityBody {
  return {
    name: d.name,
    eyebrow: d.eyebrow,
    summary: d.summary,
    description: d.description,
    openingHours: d.openingHours || undefined,
    highlights: d.highlights.map((h) => h.value),
    isPublished: d.isPublished,
    sortOrder: d.sortOrder,
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

/**
 * The full facility field grid. `active` drives the muted-at-rest
 * treatment; when false every control is disabled and the highlight
 * add/remove buttons hide.
 */
export function FacilityFields({
  form,
  active,
  busy,
}: {
  form: UseFormReturn<FacilityFormInput, unknown, FacilityFormOutput>;
  active: boolean;
  busy: boolean;
}) {
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const highlights = useFieldArray({ control, name: 'highlights' });
  const disabled = !active || busy;
  const cls = inputCls(active);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Field id="fac-name" label="Name" error={errors.name?.message}>
        <Input
          id="fac-name"
          placeholder="e.g. Garden Courtyard"
          disabled={disabled}
          aria-invalid={!!errors.name}
          className={cls}
          {...register('name')}
        />
      </Field>

      <Field
        id="fac-eyebrow"
        label="Eyebrow"
        hint='The small gold line above the name, e.g. "Unwind Outdoors".'
        error={errors.eyebrow?.message}
      >
        <Input
          id="fac-eyebrow"
          disabled={disabled}
          aria-invalid={!!errors.eyebrow}
          className={cls}
          {...register('eyebrow')}
        />
      </Field>

      <Field
        id="fac-summary"
        label="Summary"
        hint="Short blurb shown on the interlocking rows."
        error={errors.summary?.message}
        className="sm:col-span-2"
      >
        <Textarea
          id="fac-summary"
          rows={2}
          disabled={disabled}
          aria-invalid={!!errors.summary}
          className={cls}
          {...register('summary')}
        />
      </Field>

      <Field
        id="fac-description"
        label="Description"
        hint="Full copy for the facility's detail page."
        error={errors.description?.message}
        className="sm:col-span-2"
      >
        <Textarea
          id="fac-description"
          rows={5}
          disabled={disabled}
          aria-invalid={!!errors.description}
          className={cls}
          {...register('description')}
        />
      </Field>

      <Field
        id="fac-hours"
        label="Opening hours (optional)"
        hint='Shown as a chip, e.g. "Daily · 6:00 am - 10:00 pm".'
        error={errors.openingHours?.message}
      >
        <Input
          id="fac-hours"
          disabled={disabled}
          aria-invalid={!!errors.openingHours}
          className={cls}
          {...register('openingHours')}
        />
      </Field>

      <Field
        id="fac-sort"
        label="Sort order"
        hint="Lower numbers list first."
        error={errors.sortOrder?.message}
      >
        <Input
          id="fac-sort"
          inputMode="numeric"
          disabled={disabled}
          aria-invalid={!!errors.sortOrder}
          className={cls}
          {...register('sortOrder')}
        />
      </Field>

      {/* ---- Highlights ---- */}
      <div className="space-y-2 sm:col-span-2">
        <Label>Highlights</Label>
        <p className="text-xs text-muted-foreground">
          {active
            ? 'Bullet points for the "What you’ll find" grid on the detail page.'
            : highlights.fields.length === 0
              ? 'No highlights added yet.'
              : 'Shown in the "What you’ll find" grid.'}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {highlights.fields.map((field, index) => (
            <div key={field.id} className="space-y-1">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Shaded reading corners"
                  aria-label={`Highlight ${index + 1}`}
                  disabled={disabled}
                  aria-invalid={!!errors.highlights?.[index]?.value}
                  className={cls}
                  {...register(`highlights.${index}.value`)}
                />
                {active && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove highlight ${index + 1}`}
                    className="mt-1 flex-none text-muted-foreground hover:text-destructive"
                    onClick={() => highlights.remove(index)}
                    disabled={busy}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <FieldError
                message={errors.highlights?.[index]?.value?.message}
              />
            </div>
          ))}
        </div>
        {active && highlights.fields.length < 12 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => highlights.append({ value: '' })}
            disabled={busy}
          >
            <Plus />
            Add highlight
          </Button>
        )}
      </div>

      {/* ---- Publish ---- */}
      <label
        htmlFor="fac-published"
        className="flex items-center gap-2.5 sm:col-span-2"
      >
        <Checkbox
          id="fac-published"
          checked={form.watch('isPublished')}
          onCheckedChange={(v) =>
            form.setValue('isPublished', v === true, { shouldDirty: true })
          }
          disabled={disabled}
        />
        <span className="text-sm">
          Published - visible on the public site
        </span>
      </label>
    </div>
  );
}
