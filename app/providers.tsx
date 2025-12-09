'use client';

import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { I18nextProvider } from 'react-i18next';

import { i18nConfig } from '@/src/shared';
import { LocalizationProvider, NotificationProvider, StylesCacheProvider, ThemeProvider } from '@/src/shared/providers';
import { QueryProvider } from '@/src/shared/providers/QueryProvider';

import StoreProvider from './store';

type ProvidersProps = {
  children: Readonly<React.ReactNode>;
  session: Session | null;
};

const Providers = ({ children, session }: Readonly<ProvidersProps>) => {
  return (
    <SessionProvider session={session}>
      <I18nextProvider i18n={i18nConfig}>
        <QueryProvider>
          <StoreProvider>
            <StylesCacheProvider>
              <ThemeProvider>
                <LocalizationProvider>{children}</LocalizationProvider>
              </ThemeProvider>
            </StylesCacheProvider>
          </StoreProvider>
        </QueryProvider>
        <NotificationProvider />
      </I18nextProvider>
    </SessionProvider>
  );
};

export default Providers;
