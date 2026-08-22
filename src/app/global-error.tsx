// src/app/global-error.tsx
'use client';

// Last-resort boundary: replaces the ROOT layout when even it fails to
// render, so it must provide its own <html>/<body> and cannot rely on the
// app's providers, fonts, or Tailwind classes. Every value below is inline
// and literal for that reason: the palette repeats the light-theme tokens
// exactly (oklch, as globals.css declares them), and the faces fall back to
// the nearest families a browser always has.
const IVORY = 'oklch(0.981 0.031 94.9)';
const INK = 'oklch(0.275 0.026 124)';
const MUTED_INK = 'oklch(0.531 0.039 114.9)';
const CLAY = 'oklch(0.757 0.089 56.8)';
const CLAY_TEXT = 'oklch(0.5 0.089 56.8)';

const SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const SERIF = '"Cormorant Garamond", Garamond, Georgia, serif';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: IVORY,
          color: INK,
          fontFamily: SANS,
          textAlign: 'center',
          padding: '1.5rem',
        }}
      >
        <title>Something went wrong</title>
        <div style={{ maxWidth: '32rem' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.75rem',
              fontWeight: 500,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: CLAY_TEXT,
            }}
          >
            Error 500
          </p>
          <h1
            style={{
              margin: '1rem 0 0',
              fontFamily: SERIF,
              fontSize: '2.25rem',
              fontWeight: 300,
              letterSpacing: '-0.01em',
              lineHeight: 1.15,
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              margin: '1rem auto 0',
              maxWidth: '28rem',
              fontSize: '0.9375rem',
              lineHeight: 1.7,
              color: MUTED_INK,
            }}
          >
            This page could not be loaded. The fault has been logged
            {error.digest ? ` under reference ${error.digest}` : ''}.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '2rem',
              padding: '15px 38px',
              borderRadius: 0,
              border: 'none',
              background: CLAY,
              color: INK,
              fontFamily: SANS,
              fontSize: '13px',
              fontWeight: 500,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
