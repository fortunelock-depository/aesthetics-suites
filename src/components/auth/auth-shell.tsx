// src/components/auth/auth-shell.tsx
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { BrandLogo } from '@/components/site/brand-logo';
import { routes } from '@/lib/routes';

interface AuthShellProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * The frame every auth screen sits in: the brand lockup, the screen's
 * title in the display face, then the form on the site's flat square
 * surface.
 */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="border border-border bg-card">
          <div className="border-b border-border px-6 pt-8 pb-7 text-center sm:px-8">
            <div className="flex justify-center">
              <BrandLogo />
            </div>
            {title && (
              <h1 className="mt-5 font-heading text-[28px] leading-[1.2] font-light tracking-[-0.01em] text-foreground">
                {title}
              </h1>
            )}
            {subtitle && (
              <p
                className={`text-[15px] leading-[26px] text-muted-foreground ${title ? 'mt-2' : 'mt-4'}`}
              >
                {subtitle}
              </p>
            )}
          </div>
          <div className="px-6 py-7 sm:px-8">{children}</div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <Link
            href={routes.home}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to site
          </Link>
          <ThemeToggle className="h-9 w-9 border border-border text-foreground hover:bg-muted" />
        </div>
      </div>
    </div>
  );
}
