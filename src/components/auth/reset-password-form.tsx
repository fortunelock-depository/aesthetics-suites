// src/components/auth/reset-password-form.tsx
'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CtaLink } from '@/components/site/cta-link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPassword, type ResetPasswordState } from '@/lib/auth';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(
    resetPassword,
    { success: false },
  );

  useEffect(() => {
    if (state.success && state.redirectTo) {
      toast.success(state.message ?? 'Password reset.');
      router.push(state.redirectTo);
    } else if (state.errors?._form) {
      toast.error(state.errors._form[0]);
    }
  }, [state, router]);

  if (!token) {
    return (
      <div className="space-y-5 text-center">
        <p className="text-sm text-destructive">
          This reset link is missing its token. Request a new one.
        </p>
        <CtaLink href="/forgot-password" sweep="gold">
          Request a new link
        </CtaLink>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-5">
      <input type="hidden" name="token" value={token} />

      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            aria-invalid={!!state.errors?.password}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {state.errors?.password && (
          <ul className="space-y-0.5">
            {state.errors.password.map((e) => (
              <li key={e} className="text-xs text-destructive">
                {e}
              </li>
            ))}
          </ul>
        )}
      </div>

      {state.errors?._form && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
          <p className="text-xs text-destructive">{state.errors._form[0]}</p>
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-full gap-2">
        {pending ? 'Resetting…' : 'Reset password'}
        {!pending && <ArrowRight className="h-4 w-4" />}
      </Button>
    </form>
  );
}
