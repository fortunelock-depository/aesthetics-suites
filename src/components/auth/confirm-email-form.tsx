// src/components/auth/confirm-email-form.tsx
'use client';

import { useActionState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CtaLink } from '@/components/site/cta-link';
import { confirmEmailChangeAction } from '@/lib/account';
import type { ConfirmEmailChangeResult } from '@/lib/account';
import { routes } from '@/lib/routes';

const initialState: ConfirmEmailChangeResult | null = null;

/**
 * Explicit-click confirmation: the single-use token is only consumed on
 * the POST, never during the GET render - mail scanners and link
 * prefetchers (Outlook SafeLinks and friends) fetch URLs automatically,
 * and a state-changing GET would let them burn the token or apply the
 * change without the owner ever clicking.
 */
export function ConfirmEmailForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    confirmEmailChangeAction,
    initialState,
  );

  if (state) {
    return (
      <div className="space-y-5 text-center">
        {state.success ? (
          <CheckCircle2 className="mx-auto h-10 w-10 text-brand" aria-hidden />
        ) : (
          <XCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden />
        )}
        <p className="text-sm text-muted-foreground" role="status">
          {state.message}
        </p>
        <CtaLink href={routes.login} sweep="gold">
          Go to sign in
        </CtaLink>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5 text-center">
      <p className="text-sm text-muted-foreground">
        Confirm the change of your sign-in email address. Every device will
        be signed out and you will sign in again with the new address.
      </p>
      <input type="hidden" name="token" value={token} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Confirming...' : 'Confirm email change'}
      </Button>
    </form>
  );
}
