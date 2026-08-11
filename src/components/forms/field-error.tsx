// src/components/forms/field-error.tsx

/**
 * Inline validation message under a form field. Renders nothing without a
 * message so fields don't reserve dead space.
 */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}
