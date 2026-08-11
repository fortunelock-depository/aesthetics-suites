// src/components/forms/labeled-select.tsx
'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldError } from './field-error';

export interface SelectOption {
  value: string;
  label: string;
}

interface LabeledSelectProps {
  label: string;
  options: SelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  id?: string;
  disabled?: boolean;
  /**
   * Keep the label for screen readers only - for compact slots (a lone
   * toolbar filter beside the search box) where a visible label would
   * misalign the control.
   */
  srOnlyLabel?: boolean;
}

/**
 * Label + shadcn Select + error. Controlled - pair with react-hook-form via
 * Controller:
 *   <Controller name="role" control={control} render={({ field }) => (
 *     <LabeledSelect label="Role" options={...} value={field.value}
 *       onValueChange={field.onChange} error={errors.role?.message} /> )} />
 */
export function LabeledSelect({
  label,
  options,
  value,
  onValueChange,
  placeholder = 'Select…',
  error,
  id,
  disabled,
  srOnlyLabel = false,
}: LabeledSelectProps) {
  return (
    <div className={srOnlyLabel ? undefined : 'space-y-1.5'}>
      <Label htmlFor={id} className={srOnlyLabel ? 'sr-only' : undefined}>
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id={id} aria-invalid={!!error}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError message={error} />
    </div>
  );
}
