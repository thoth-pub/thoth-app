'use client';

import { SessionProvider } from 'next-auth/react';
import { I18nextProvider } from 'react-i18next';

import SessionWatch from '@/src/features/auth/ui/SessionWatch/SessionWatch';
import { i18nConfig } from '@/src/shared/i18n';
import { LocalizationProvider, NotificationProvider, StylesCacheProvider, ThemeProvider } from '@/src/shared/providers';
import { QueryProvider } from '@/src/shared/providers/QueryProvider';

import StoreProvider from './store';

// APP-AUTH-SESSION-EXPIRY-01 (thoth-app#285): an open page re-checks its
// session on this bounded interval, as well as whenever the window regains
// focus (NextAuth's default), so that an expired session is noticed by the page
// that is still showing rather than only by the next page request.
const SESSION_REFETCH_INTERVAL_SECONDS = 5 * 60;

type ProvidersProps = {
  children: Readonly<React.ReactNode>;
};

const Providers = ({ children }: Readonly<ProvidersProps>) => {
  return (
    <SessionProvider refetchInterval={SESSION_REFETCH_INTERVAL_SECONDS} refetchOnWindowFocus>
      <SessionWatch />
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
