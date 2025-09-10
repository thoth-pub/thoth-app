'use client';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';

const StylesCacheProvider = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <AppRouterCacheProvider
      options={{
        enableCssLayer: true,
      }}
    >
      {children}
    </AppRouterCacheProvider>
  );
};

export default StylesCacheProvider;
