'use client';

import { SessionProvider } from 'next-auth/react';

import {
  ApolloClientProvider,
  LocalizationProvider,
  NotificationProvider,
  StylesCacheProvider,
  ThemeProvider,
} from '@/src/shared/providers';

import StoreProvider from './store';

const Providers = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <SessionProvider>
      <ApolloClientProvider>
        <StoreProvider>
          <StylesCacheProvider>
            <ThemeProvider>
              <LocalizationProvider>{children}</LocalizationProvider>
            </ThemeProvider>
          </StylesCacheProvider>
        </StoreProvider>
      </ApolloClientProvider>
      <NotificationProvider />
    </SessionProvider>
  );
};

export default Providers;
