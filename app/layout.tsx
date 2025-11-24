import './styles/globals.css';
import { SpeedInsights } from '@vercel/speed-insights/next';

import type { Metadata } from 'next';
import { Economica, Open_Sans } from 'next/font/google';

import { auth } from '@/auth';
import { appConfig } from '@/src/shared/config';

import Providers from './providers';
import { UpdateNavigationState } from '@/src/features';

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
  const session = await auth();

  return (
    <html lang="en">
      <Providers session={session}>
        <body
          className={`${economica.variable} ${openSans.variable} m-auto flex h-dvh min-h-dvh max-w-[var(--max-width)] flex-col px-8 py-2 antialiased lg:px-5 lg:py-3`}
        >
          <main className="flex flex-1">{children}</main>
          <SpeedInsights />
          <UpdateNavigationState />
        </body>
      </Providers>
    </html>
  );
}
