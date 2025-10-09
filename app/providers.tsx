'use client';

import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';

import {
  ApolloClientProvider,
  LocalizationProvider,
  NotificationProvider,
  StylesCacheProvider,
  ThemeProvider,
} from '@/src/shared/providers';

import StoreProvider from './store';

type ProvidersProps = {
  children: Readonly<React.ReactNode>;
  session: Session | null;
};

const Providers = ({ children, session }: Readonly<ProvidersProps>) => {
  return (
    <SessionProvider session={session}>
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
