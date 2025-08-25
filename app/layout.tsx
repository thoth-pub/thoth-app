import './globals.css';

import type { Metadata } from 'next';
import { Economica, Open_Sans } from 'next/font/google';

import Providers from './providers';

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
  title: 'Thoth Metadata Management Platform',
  description: ' Metadata Management Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${economica.variable} ${openSans.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
