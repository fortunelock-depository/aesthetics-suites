// src/components/admin/users/create-user-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

/**
 * Staff account creation (SUPER_ADMIN only - the API enforces it). The
 * password is set here and shared with the new user out of band; they can
 * change it from Security once signed in.
 */
export function CreateUserForm() {
  const router = useRouter();
  const [createUser, { isLoading }] = useCreateUserMutation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(createUserSchema),
    mode: 'onTouched',
    defaultValues: {
      email: '',
      fullname: '',
      phone: '',
      role: 'FRONT_DESK',
      password: '',
    },
  });

  const onSubmit = async (data: FormOutput) => {
    try {
      const res = await createUser(data).unwrap();
      toast.success('User created');
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
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="max-w-md space-y-4"
    >
      <TextField
        label="Full name"
        placeholder="e.g. Ama Mensah"
        autoComplete="off"
        error={errors.fullname?.message}
        {...register('fullname')}
      />
      <TextField
        label="Email"
        type="email"
        placeholder="name@example.com"
        autoComplete="off"
        error={errors.email?.message}
        {...register('email')}
      />
      <div className="max-w-56">
        <TextField
          label="Phone (optional)"
          type="tel"
          placeholder="024 123 4567"
          autoComplete="off"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>
      <Controller
        name="role"
        control={control}
        render={({ field }) => (
          <LabeledSelect
            id="role"
            label="Role"
            options={ROLE_OPTIONS}
            value={field.value}
            onValueChange={field.onChange}
            error={errors.role?.message}
          />
        )}
      />

      <div className="space-y-1.5">
        <Label htmlFor="password">Temporary password</Label>
        <div className="relative">
          <Input
            id="password"
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
        {!errors.password && (
          <p className="text-xs text-muted-foreground">
            Share it with the user securely - they can change it from
            Security after signing in.
          </p>
        )}
        <FieldError message={errors.password?.message} />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading && <Loader2 className="animate-spin" />}
        {isLoading ? 'Creating…' : 'Create user'}
      </Button>
    </form>
  );
}
