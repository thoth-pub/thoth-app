import './styles/globals.css';

import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import { Economica, Open_Sans } from 'next/font/google';

import { UpdateNavigationState } from '@/src/features';
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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Providers>
        <body
          className={`${economica.variable} ${openSans.variable} m-auto flex h-dvh min-h-dvh max-w-(--max-width) flex-col px-5 py-2 antialiased xl:py-3`}
        >
          <main className="flex flex-1">{children}</main>
          <SpeedInsights />
          <UpdateNavigationState />
        </body>
      </Providers>
    </html>
  );
}
