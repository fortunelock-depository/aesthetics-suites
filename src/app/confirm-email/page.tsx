// src/app/confirm-email/page.tsx
import type { Metadata } from 'next';
import { CheckCircle2, XCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { CtaLink } from '@/components/site/cta-link';
import { confirmEmailChange } from '@/lib/account';
import { routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Confirm email change',
  robots: { index: false, follow: false },
};

// The token arrives by email, so the visitor may not be signed in - the
// token itself is the credential (single-use, 24h, sha256-stored).
export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const result = token
    ? await confirmEmailChange(token)
    : {
        success: false,
        message: 'This confirmation link is missing its token.',
      };

  return (
    <AuthShell
      title="Email change"
      subtitle={result.success ? 'All done' : 'Something went wrong'}
    >
      <div className="space-y-5 text-center">
        {result.success ? (
          <CheckCircle2 className="mx-auto h-10 w-10 text-brand" aria-hidden />
        ) : (
          <XCircle
            className="mx-auto h-10 w-10 text-destructive"
            aria-hidden
          />
        )}
        <p className="text-sm text-muted-foreground">{result.message}</p>
        <CtaLink href={routes.login} sweep="gold">
          Go to sign in
        </CtaLink>
      </div>
    </AuthShell>
  );
}
