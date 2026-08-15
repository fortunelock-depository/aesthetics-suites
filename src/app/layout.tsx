// src/app/layout.tsx
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { StoreProvider } from '@/redux/store-provider';
import { SITE } from '@/config/constants';
import { clampDescription } from '@/lib/seo';
import './globals.css';

// Both faces are self-hosted (latin subset, woff2) rather than fetched from
// Google at build time. `next/font/google` downloads the files during
// `next build`, which makes every deploy depend on a third-party network
// call - it has already failed a build once for reasons unrelated to the
// code. These are the same files Google would have served.

// Body face - matches the reference template (Lato ships 400/700 only).
const lato = localFont({
  src: [
    { path: './fonts/lato-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/lato-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

// Display face for headings (the Hostily-inspired landing look).
const baiJamjuree = localFont({
  src: [
    { path: './fonts/bai-jamjuree-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/bai-jamjuree-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/bai-jamjuree-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/bai-jamjuree-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-heading',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  // No root-level canonical: Next metadata INHERITS it, which stamped
  // every detail page as a duplicate of the homepage (deindex risk).
  // pageMetadata()/generateMetadata set per-path canonicals instead.
  // OG/Twitter images come from the opengraph-image.tsx file conventions,
  // generated at build time from src/lib/og-image.tsx.
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    locale: SITE.locale,
    url: SITE.url,
    title: SITE.title,
    description: clampDescription(SITE.description, 125),
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.title,
    description: clampDescription(SITE.description, 125),
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lato.variable} ${baiJamjuree.variable}`}
      suppressHydrationWarning
    >
      <body>
        <StoreProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex min-h-dvh flex-col">{children}</div>
            <Toaster />
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
