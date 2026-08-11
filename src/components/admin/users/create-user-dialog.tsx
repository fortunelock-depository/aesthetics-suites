// src/components/admin/users/create-user-dialog.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveFormDialog } from '@/components/ui/responsive-form-dialog';
import { TextField } from '@/components/forms/text-field';
import { LabeledSelect } from '@/components/forms/labeled-select';
import { FieldError } from '@/components/forms/field-error';
import { createUserSchema } from '@/validations/user-validation';
import { useCreateUserMutation } from '@/redux/users-api';
import { extractApiError } from '@/lib/extract-api-error';
import { USER_ROLES, USER_ROLE_LABEL } from '@/types/user.types';

// The SAME schema the API enforces; transforms (phone -> E.164) run on
// submit. Input = what the fields hold, Output = what the API receives.
type FormInput = z.input<typeof createUserSchema>;
type FormOutput = z.output<typeof createUserSchema>;

const ROLE_OPTIONS = USER_ROLES.map((role) => ({
  value: role,
  label: USER_ROLE_LABEL[role],
}));

const BLANK: FormInput = {
  fullname: '',
  email: '',
  phone: '',
  role: 'FRONT_DESK',
  password: '',
};

/**
 * Staff-account creation in the dms form-dialog shell: a centred modal on
 * tablet and up, a full-screen slide-over on phones. SUPER_ADMIN only -
 * the API enforces it. The password is set here and shared out of band;
 * the user can change it from their own Security tab.
 */
export function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [createUser, { isLoading }] = useCreateUserMutation();
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    control,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(createUserSchema),
    mode: 'onTouched',
    defaultValues: BLANK,
  });

  // Start each open with a clean form.
  React.useEffect(() => {
    if (open) reset(BLANK);
  }, [open, reset]);

  const onSubmit = async (data: FormOutput) => {
    try {
      const res = await createUser(data).unwrap();
      toast.success('User created');
      onOpenChange(false);
      router.push(`/admin/users/${res.data.id}`);
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
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add user"
      description="Create a staff account and choose what it can access."
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-5"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField
            label="Full name"
            placeholder="e.g. Ama Mensah"
            autoComplete="off"
            error={errors.fullname?.message}
            {...register('fullname')}
          />
          <TextField
            label="Phone (optional)"
            type="tel"
            placeholder="024 123 4567"
            autoComplete="off"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <div className="sm:col-span-2">
            <TextField
              label="Email"
              type="email"
              placeholder="name@example.com"
              autoComplete="off"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <LabeledSelect
                id="create-user-role"
                label="Role"
                options={ROLE_OPTIONS}
                value={field.value}
                onValueChange={field.onChange}
                error={errors.role?.message}
              />
            )}
          />
          <div className="space-y-1.5">
            <Label htmlFor="create-user-password">Temporary password</Label>
            <div className="relative">
              <Input
                id="create-user-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <FieldError message={errors.password?.message} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Share the temporary password with the user securely - they can
          change it from their Security tab after signing in.
        </p>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <UserPlus />}
            {isLoading ? 'Creating…' : 'Create user'}
          </Button>
        </div>
      </form>
    </ResponsiveFormDialog>
  );
}

/** The "Add user" header action that owns the dialog's open state. */
export function AddUserButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus />
        Add user
      </Button>
      <CreateUserDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
