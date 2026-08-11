// src/components/admin/services/service-form.tsx
//
// The one source of truth for service form fields, shared by the create
// page and the detail page's read-only-until-edit card. Inputs hold
// strings; the schema parses to the API contract (serviceCreateSchema)
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
  ICreateServiceBody,
  IServiceRow,
} from '@/types/service.types';

/** dms input treatment: calm muted fill at rest, alive while editing. */
const inputCls = (active: boolean) =>
  cn(
    'transition-all duration-200',
    active
      ? 'border-brand/40 bg-background focus:border-brand'
      : 'border-border bg-muted/50 text-foreground',
  );

/** Mirrors validations/hotel-validation.ts (serviceCreateSchema). */
export const serviceFormSchema = z.object({
  name: z.string().trim().min(2, 'Enter the service name').max(80),
  eyebrow: z.string().trim().min(2, 'Enter the eyebrow line').max(60),
  summary: z.string().trim().min(10, 'At least 10 characters').max(300),
  description: z.string().trim().min(20, 'At least 20 characters').max(10_000),
  availability: z.string().trim().max(120),
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

export type ServiceFormInput = z.input<typeof serviceFormSchema>;
export type ServiceFormOutput = z.output<typeof serviceFormSchema>;

export const BLANK_FACILITY: ServiceFormInput = {
  name: '',
  eyebrow: '',
  summary: '',
  description: '',
  availability: '',
  sortOrder: '0',
  isPublished: false,
  highlights: [],
};

/** Saved record -> form field strings; arrays guarded (fail-safe rule). */
export function serviceToFormDefaults(
  service: IServiceRow,
): ServiceFormInput {
  const highlights = Array.isArray(service.highlights)
    ? service.highlights
    : [];
  return {
    name: service.name,
    eyebrow: service.eyebrow,
    summary: service.summary,
    description: service.description,
    availability: service.availability ?? '',
    sortOrder: String(service.sortOrder),
    isPublished: service.isPublished,
    highlights: highlights.map((value) => ({ value })),
  };
}

/** Parsed form output -> the API body ('' clears availability on update). */
export function toServiceBody(d: ServiceFormOutput): ICreateServiceBody {
  return {
    name: d.name,
    eyebrow: d.eyebrow,
    summary: d.summary,
    description: d.description,
    availability: d.availability || undefined,
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
 * The full service field grid. `active` drives the dms muted-at-rest
 * treatment; when false every control is disabled and the highlight
 * add/remove buttons hide.
 */
export function ServiceFields({
  form,
  active,
  busy,
}: {
  form: UseFormReturn<ServiceFormInput, unknown, ServiceFormOutput>;
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
      <Field id="svc-name" label="Name" error={errors.name?.message}>
        <Input
          id="svc-name"
          placeholder="e.g. Private Chef Dinners"
          disabled={disabled}
          aria-invalid={!!errors.name}
          className={cls}
          {...register('name')}
        />
      </Field>

      <Field
        id="svc-eyebrow"
        label="Eyebrow"
        hint='The small gold line above the name, e.g. "At Your Service".'
        error={errors.eyebrow?.message}
      >
        <Input
          id="svc-eyebrow"
          disabled={disabled}
          aria-invalid={!!errors.eyebrow}
          className={cls}
          {...register('eyebrow')}
        />
      </Field>

      <Field
        id="svc-summary"
        label="Summary"
        hint="Short blurb shown on the interlocking rows."
        error={errors.summary?.message}
        className="sm:col-span-2"
      >
        <Textarea
          id="svc-summary"
          rows={2}
          disabled={disabled}
          aria-invalid={!!errors.summary}
          className={cls}
          {...register('summary')}
        />
      </Field>

      <Field
        id="svc-description"
        label="Description"
        hint="Full copy for the service's detail page."
        error={errors.description?.message}
        className="sm:col-span-2"
      >
        <Textarea
          id="svc-description"
          rows={5}
          disabled={disabled}
          aria-invalid={!!errors.description}
          className={cls}
          {...register('description')}
        />
      </Field>

      <Field
        id="svc-hours"
        label="Availability (optional)"
        hint='Shown as a chip, e.g. "Daily · on request".'
        error={errors.availability?.message}
      >
        <Input
          id="svc-hours"
          disabled={disabled}
          aria-invalid={!!errors.availability}
          className={cls}
          {...register('availability')}
        />
      </Field>

      <Field
        id="svc-sort"
        label="Sort order"
        hint="Lower numbers list first."
        error={errors.sortOrder?.message}
      >
        <Input
          id="svc-sort"
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
                  placeholder="e.g. Four-course tasting menu"
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
        htmlFor="svc-published"
        className="flex items-center gap-2.5 sm:col-span-2"
      >
        <Checkbox
          id="svc-published"
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
