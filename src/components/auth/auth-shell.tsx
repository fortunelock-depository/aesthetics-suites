// src/components/auth/auth-shell.tsx
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { SITE } from '@/config/constants';
import { routes } from '@/lib/routes';

interface AuthShellProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-6 pt-8 pb-6 text-center sm:px-8">
            <Link
              href={routes.home}
              className="inline-block text-xl font-semibold tracking-tight text-foreground"
            >
              {SITE.name}
            </Link>
            {title && (
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>
            )}
            {subtitle && (
              <p
                className={`text-sm text-muted-foreground ${title ? 'mt-1' : 'mt-3'}`}
              >
                {subtitle}
              </p>
            )}
          </div>
          <div className="px-6 py-6 sm:px-8">{children}</div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <Link
            href={routes.home}
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to site
          </Link>
          <ThemeToggle className="h-9 w-9 border border-border text-foreground hover:bg-muted" />
        </div>
      </div>
    </div>
  );
}
