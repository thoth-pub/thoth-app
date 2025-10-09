import './styles/globals.css';

import type { Metadata } from 'next';
import { Economica, Open_Sans } from 'next/font/google';

import { auth } from '@/auth';
import { SignOutButton } from '@/src/features';
import { appConfig } from '@/src/shared/config';
import { Footer, Header } from '@/src/shared/ui';

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
  const session = await auth();

  return (
    <html lang="en">
      <Providers session={session}>
        <body className={`${economica.variable} ${openSans.variable} flex h-dvh min-h-dvh flex-col antialiased`}>
          <Header>{session && <SignOutButton />}</Header>
          <main className="flex flex-1">{children}</main>
          <Footer />
        </body>
      </Providers>
    </html>
  );
}
