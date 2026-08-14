// src/components/forms/field-error.tsx

/**
 * Inline validation message under a form field. Renders nothing without a
 * message so fields don't reserve dead space. Give it an `id` and point
 * the input's `aria-describedby` at it (TextField wires this up) so
 * screen readers announce WHY the field is invalid, not just that it is;
 * role="alert" announces the message the moment it appears.
 */
export function FieldError({
  message,
  id,
}: {
  message?: string;
  id?: string;
}) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}
