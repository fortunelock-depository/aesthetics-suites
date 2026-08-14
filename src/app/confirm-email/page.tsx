// src/app/confirm-email/page.tsx
import type { Metadata } from 'next';
import { XCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { ConfirmEmailForm } from '@/components/auth/confirm-email-form';
import { CtaLink } from '@/components/site/cta-link';
import { routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Confirm email change',
  robots: { index: false, follow: false },
};

// The token arrives by email, so the visitor may not be signed in - the
// token itself is the credential (single-use, 24h, sha256-stored). It is
// consumed by the form's POST, never by this GET render, so an email
// scanner prefetching the link cannot burn it.
export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell
      title="Email change"
      subtitle={token ? 'One more step' : 'Something went wrong'}
    >
      {token ? (
        <ConfirmEmailForm token={token} />
      ) : (
        <div className="space-y-5 text-center">
          <XCircle
            className="mx-auto h-10 w-10 text-destructive"
            aria-hidden
          />
          <p className="text-sm text-muted-foreground">
            This confirmation link is missing its token.
          </p>
          <CtaLink href={routes.login} sweep="gold">
            Go to sign in
          </CtaLink>
        </div>
      )}
    </AuthShell>
  );
}
