// src/components/auth/forgot-password-form.tsx
'use client';

import { useActionState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgotPassword, type ForgotPasswordState } from '@/lib/auth';

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<
    ForgotPasswordState,
    FormData
  >(forgotPassword, { success: false });

  useEffect(() => {
    if (state.success && state.message) toast.success(state.message);
    else if (state.error) toast.error(state.error);
  }, [state]);

  if (state.success) {
    return (
      <div className="space-y-5 text-center">
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={!!state.error}
        />
        {state.error && (
          <p className="text-xs text-destructive">{state.error}</p>
        )}
      </div>

      <Button type="submit" disabled={pending} className="w-full gap-2">
        {pending ? 'Sending…' : 'Send reset link'}
        {!pending && <ArrowRight className="h-4 w-4" />}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="transition-colors hover:text-foreground">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
