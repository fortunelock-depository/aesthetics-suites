// src/components/auth/two-factor-login-step.tsx
'use client';

import { useActionState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  verifyTwoFactorLogin,
  resendTwoFactorCode,
  type TwoFactorState,
} from '@/lib/auth';

interface TwoFactorLoginStepProps {
  maskedEmail?: string;
}

export function TwoFactorLoginStep({ maskedEmail }: TwoFactorLoginStepProps) {
  const router = useRouter();
  const [resending, startResend] = useTransition();

  const [state, action, pending] = useActionState<TwoFactorState, FormData>(
    verifyTwoFactorLogin,
    { success: false },
  );

  useEffect(() => {
    if (state.success && state.redirectTo) {
      toast.success('Signed in successfully');
      router.push(state.redirectTo);
    } else if (state.resent) {
      toast.success('A new code has been sent.');
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  const handleResend = () => {
    startResend(async () => {
      const result = await resendTwoFactorCode();
      if (result.resent) toast.success('A new code has been sent.');
      else if (result.error) toast.error(result.error);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm text-muted-foreground">
          Enter the 6-digit code we sent to
          {maskedEmail ? ` ${maskedEmail}` : ' your email'}.
        </p>
      </div>

      <form action={action} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            aria-invalid={!!state.error}
            className="text-center text-lg tracking-[0.5em]"
          />
          {state.error && (
            <p className="text-xs text-destructive">{state.error}</p>
          )}
        </div>

        <Button type="submit" disabled={pending} className="w-full gap-2">
          {pending ? 'Verifying…' : 'Verify & sign in'}
          {!pending && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {resending ? 'Sending…' : "Didn't get it? Resend code"}
        </button>
      </div>
    </div>
  );
}
