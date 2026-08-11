// src/components/admin/users/edit-user-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/forms/text-field';
import { updateUserDetailsSchema } from '@/validations/user-validation';
import { useUpdateUserMutation } from '@/redux/users-api';
import { extractApiError } from '@/lib/extract-api-error';
import type { IUserRow } from '@/types/user.types';

// Shared with PATCH /api/users/[id]; emptying phone clears it (-> null).
type FormInput = z.input<typeof updateUserDetailsSchema>;
type FormOutput = z.output<typeof updateUserDetailsSchema>;

/**
 * Name/email/phone edits. Role deliberately lives outside this form - it
 * changes what the account can do, so it gets its own confirmed control.
 */
export function EditUserForm({
  user,
  onCancel,
  onSaved,
}: {
  user: IUserRow;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [updateUser, { isLoading }] = useUpdateUserMutation();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(updateUserDetailsSchema),
    mode: 'onTouched',
    defaultValues: {
      fullname: user.fullname,
      email: user.email,
      phone: user.phone ?? '',
    },
  });

  const onSubmit = async (data: FormOutput) => {
    try {
      await updateUser({ id: user.id, body: data }).unwrap();
      toast.success('User updated');
      onSaved();
    } catch (err) {
      const { message, fieldErrors } = extractApiError(err);
      if (fieldErrors) {
        for (const [field, msg] of Object.entries(fieldErrors)) {
          setError(field as keyof FormInput, { message: msg });
        }
      }
      toast.error(message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="max-w-md space-y-4"
    >
      <TextField
        label="Full name"
        error={errors.fullname?.message}
        {...register('fullname')}
      />
      <TextField
        label="Email"
        type="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <div className="max-w-56">
        <TextField
          label="Phone"
          type="tel"
          placeholder="024 123 4567"
          hint="Leave empty to clear the saved number."
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="animate-spin" />}
          {isLoading ? 'Saving…' : 'Save changes'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
