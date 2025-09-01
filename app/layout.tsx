import './globals.css';

import type { Metadata } from 'next';
import { Economica, Open_Sans } from 'next/font/google';

import { auth } from '@/auth';
import { Footer, Header, SignOutButton } from '@/components';
import { config } from '@/config';

import Providers from './providers';

const {
  meta: { title, description },
} = config;

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
      <Providers>
        <body className={`${economica.variable} ${openSans.variable} flex h-dvh min-h-dvh flex-col antialiased`}>
          <Header>{session && <SignOutButton />}</Header>
          <main className="flex flex-1">{children}</main>
          <Footer />
        </body>
      </Providers>
    </html>
  );
}
