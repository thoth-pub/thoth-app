'use client';

import { SessionProvider } from 'next-auth/react';

import { ApolloClientProvider, LocalizationProvider, NotificationProvider, StylesCacheProvider, ThemeProvider } from '@/src/shared/providers';

const Providers = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <SessionProvider>
      <ApolloClientProvider>
        <StylesCacheProvider>
          <ThemeProvider>
            <LocalizationProvider>{children}</LocalizationProvider>
          </ThemeProvider>
        </StylesCacheProvider>
      </ApolloClientProvider>
      <NotificationProvider />
    </SessionProvider>
  );
};

export default Providers;
