import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';

const StylesCacheProvider = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return <AppRouterCacheProvider>{children}</AppRouterCacheProvider>;
};

export default StylesCacheProvider;
