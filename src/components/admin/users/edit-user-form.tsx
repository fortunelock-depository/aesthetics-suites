// src/components/admin/users/edit-user-form.tsx
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Loader2, Pencil, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateUserDetailsSchema } from '@/validations/user-validation';
import { useUpdateUserMutation } from '@/redux/users-api';
import { extractApiError } from '@/lib/extract-api-error';
import { cn } from '@/lib/utils';
import type { IUserRow } from '@/types/user.types';

// Shared with PATCH /api/users/[id]; emptying phone clears it (-> null).
type FormInput = z.input<typeof updateUserDetailsSchema>;
type FormOutput = z.output<typeof updateUserDetailsSchema>;

/** dms input treatment: calm muted fill at rest, alive while editing. */
const inputCls = (active: boolean) =>
  cn(
    'h-11 font-medium transition-all duration-200',
    active
      ? 'border-brand/40 bg-background focus:border-brand'
      : 'border-border bg-muted/50 text-foreground',
  );

/**
 * The dms profile form for OTHER users: fields always visible, read-only
 * (muted) until Edit details is clicked. Role deliberately lives outside
 * this form - it changes what the account can do, so it gets its own
 * confirmed control.
 */
export function EditUserForm({ user }: { user: IUserRow }) {
  const [editing, setEditing] = React.useState(false);
  const [updateUser, { isLoading }] = useUpdateUserMutation();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(updateUserDetailsSchema),
    defaultValues: {
      fullname: user.fullname,
      phone: user.phone ?? '',
    },
  });

  const handleCancel = () => {
    reset({
      fullname: user.fullname,
      phone: user.phone ?? '',
    });
    setEditing(false);
  };

  const onSubmit = async (data: FormOutput) => {
    try {
      await updateUser({ id: user.id, body: data }).unwrap();
      toast.success('User updated');
      setEditing(false);
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

  const disabled = !editing || isLoading;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="grid grid-cols-1 gap-5 @xl:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="user-fullname">Full name</Label>
          <Input
            id="user-fullname"
            disabled={disabled}
            aria-invalid={!!errors.fullname}
            className={inputCls(editing)}
            {...register('fullname')}
          />
          {errors.fullname && (
            <p className="text-xs text-destructive">
              {errors.fullname.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-phone">Phone</Label>
          <Input
            id="user-phone"
            type="tel"
            placeholder="024 123 4567"
            disabled={disabled}
            aria-invalid={!!errors.phone}
            className={inputCls(editing)}
            {...register('phone')}
          />
          {errors.phone ? (
            <p className="text-xs text-destructive">{errors.phone.message}</p>
          ) : (
            editing && (
              <p className="text-xs text-muted-foreground">
                Leave empty to clear the saved number.
              </p>
            )
          )}
        </div>

        <div className="space-y-2 @xl:col-span-2">
          <Label htmlFor="user-email">Email</Label>
          <Input
            id="user-email"
            type="email"
            value={user.email}
            disabled
            readOnly
            className={inputCls(false)}
          />
          <p className="text-xs text-muted-foreground">
            Users change their own email from their profile - it is not
            admin-managed.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        {!editing ? (
          <Button type="button" onClick={() => setEditing(true)}>
            <Pencil />
            Edit details
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
              {isLoading ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
