'use client';

import { SessionProvider } from 'next-auth/react';

import { ApolloClientProvider, NotificationProvider, StylesCacheProvider, ThemeProvider } from '@/providers';

const Providers = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <SessionProvider>
      <ApolloClientProvider>
        <StylesCacheProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </StylesCacheProvider>
      </ApolloClientProvider>
      <NotificationProvider />
    </SessionProvider>
  );
};

export default Providers;
