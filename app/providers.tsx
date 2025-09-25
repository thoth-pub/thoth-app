'use client';

import { SessionProvider } from 'next-auth/react';

import { FormStateMachineContext } from '@/src/shared';
import {
  ApolloClientProvider,
  LocalizationProvider,
  NotificationProvider,
  StylesCacheProvider,
  ThemeProvider,
} from '@/src/shared/providers';

const Providers = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <SessionProvider>
      <ApolloClientProvider>
        <FormStateMachineContext.Provider>
          <StylesCacheProvider>
            <ThemeProvider>
              <LocalizationProvider>{children}</LocalizationProvider>
            </ThemeProvider>
          </StylesCacheProvider>
        </FormStateMachineContext.Provider>
      </ApolloClientProvider>
      <NotificationProvider />
    </SessionProvider>
  );
};

export default Providers;
