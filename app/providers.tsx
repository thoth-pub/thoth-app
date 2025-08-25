'use client';

import { ApolloClientProvider, StylesCacheProvider, ThemeProvider } from '@/providers';

const Providers = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <ApolloClientProvider>
      <StylesCacheProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </StylesCacheProvider>
    </ApolloClientProvider>
  );
};

export default Providers;
