'use client';

// Route error boundary: catches render/data errors anywhere below the root
// layout (theme, background, and chrome stay intact) and offers a retry.
import { useEffect } from 'react';
import Link from 'next/link';
import { Home, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in the browser console / client-side monitoring; the digest
    // matches the server log entry for the underlying error.
    console.error('Route error boundary:', error);
  }, [error]);

  return (
    <section className="flex min-h-dvh items-center justify-center px-6 py-24">
      <div className="text-center">
        <p className="text-8xl font-medium leading-none tracking-tight md:text-9xl">
          500
        </p>

        <h1 className="mt-6 text-2xl font-medium text-foreground md:text-3xl">
          Something went wrong
        </h1>

        <p className="mx-auto mt-3 max-w-md text-lg leading-relaxed text-muted-foreground">
          An unexpected error occurred while loading this page. It has been
          logged{error.digest ? ` (ref: ${error.digest})` : ''} - please try
          again.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button className="gap-2" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href={routes.home}>
              <Home className="h-4 w-4" />
              Go home
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
