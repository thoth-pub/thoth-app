import './globals.css';

import type { Metadata } from 'next';
import { Economica, Open_Sans } from 'next/font/google';

import { Footer, Header } from '@/components';
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Providers>
        <body className={`${economica.variable} ${openSans.variable} flex h-dvh min-h-dvh flex-col antialiased`}>
          <Header />
          {children}
          <Footer />
        </body>
      </Providers>
    </html>
  );
}
