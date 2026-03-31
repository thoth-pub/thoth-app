import './styles/globals.css';

import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import { Economica, Open_Sans } from 'next/font/google';

import { appConfig } from '@/src/shared/config';

import Providers from './providers';

const {
  meta: { title, description },
} = appConfig;

const openSans = Open_Sans({
  variable: '--font-open-sans',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

const economica = Economica({
  variable: '--font-economica',
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title,
  description,
  icons: {
    icon: [
      { url: '/favicons/favicon.ico', sizes: 'any' },
      { url: '/favicons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/favicons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/favicons/site.webmanifest',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${economica.variable} ${openSans.variable} m-auto flex h-dvh min-h-dvh max-w-(--max-width) flex-col px-5 py-2 antialiased xl:py-3`}
      >
        <Providers>
          <main className="flex flex-1">{children}</main>
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  );
}
