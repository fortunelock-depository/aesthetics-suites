// src/components/forms/date-form-field.tsx
'use client';

import { DateField, type DateFieldProps } from '@/components/ui/date-field';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { FieldError } from './field-error';

/**
 * Makes a `<DateField />` trigger read as one of the dense admin `<Input />`
 * boxes standing beside it: the same 2rem height, padding, border, type
 * scale and invalid/disabled treatment. DateField itself ships unboxed so
 * the roomier public forms can dress it their own way, so the box lives
 * here, next to the fields that need it.
 */
export const DATE_FIELD_BOX = cn(
  'h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 transition-colors md:text-sm',
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-0',
  'data-[invalid=true]:border-destructive data-[invalid=true]:ring-3 data-[invalid=true]:ring-destructive/20',
  'disabled:bg-input/50 disabled:opacity-50',
  'dark:bg-input/30 dark:disabled:bg-input/80',
  'dark:data-[invalid=true]:border-destructive/50 dark:data-[invalid=true]:ring-destructive/40',
);

interface DateFormFieldProps extends Omit<DateFieldProps, 'aria-describedby'> {
  label: string;
  /** The trigger is a button, so the label needs a real id to point at. */
  id: string;
  /** react-hook-form: `errors.<name>?.message`. */
  error?: string;
  hint?: string;
}

/**
 * Label + date trigger + error in the same layout TextField uses, so a date
 * sits flush in an admin form grid. The value contract is the native input's
 * ('YYYY-MM-DD', empty when unset), so it drops into react-hook-form through
 * a Controller:
 *   <Controller name="startsAt" control={control} render={({ field }) => (
 *     <DateFormField id="…" label="Starts" value={field.value}
 *       onChange={field.onChange} error={errors.startsAt?.message} /> )} />
 */
export function DateFormField({
  label,
  error,
  hint,
  id,
  className,
  ...props
}: DateFormFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="space-y-1.5">
      <Label id={`${id}-label`} htmlFor={id}>{label}</Label>
      <DateField
        id={id}
        invalid={!!error}
        aria-labelledby={`${id}-label`}
        aria-describedby={errorId}
        className={cn(DATE_FIELD_BOX, className)}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}
