// src/app/layout.tsx
import type { Metadata } from 'next';
import { Bai_Jamjuree, Lato } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { StoreProvider } from '@/redux/store-provider';
import { SITE } from '@/config/constants';
import { clampDescription } from '@/lib/seo';
import './globals.css';

// Body face - matches the reference template (Lato ships 400/700 only).
const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-sans',
  display: 'swap',
});

// Display face for headings (the Hostily-inspired landing look).
const baiJamjuree = Bai_Jamjuree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
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
