// src/components/forms/text-field.tsx
'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from './field-error';

interface TextFieldProps extends React.ComponentProps<'input'> {
  label: string;
  /** react-hook-form: `errors.<name>?.message`. */
  error?: string;
  hint?: string;
}

/**
 * Label + input + error in the standard layout. Designed for react-hook-form's
 * `register`: `<TextField label="Email" error={errors.email?.message}
 * {...register('email')} />`.
 */
export function TextField({
  label,
  error,
  hint,
  id,
  name,
  ...props
}: TextFieldProps) {
  const fieldId = id ?? name;
  const errorId = error ? `${fieldId}-error` : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        id={fieldId}
        name={name}
        aria-invalid={!!error}
        aria-describedby={errorId}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

interface TextAreaFieldProps extends React.ComponentProps<'textarea'> {
  label: string;
  error?: string;
  hint?: string;
}

/** Textarea variant of TextField, same register-friendly API. */
export function TextAreaField({
  label,
  error,
  hint,
  id,
  name,
  ...props
}: TextAreaFieldProps) {
  const fieldId = id ?? name;
  const errorId = error ? `${fieldId}-error` : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      <Textarea
        id={fieldId}
        name={name}
        aria-invalid={!!error}
        aria-describedby={errorId}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}
