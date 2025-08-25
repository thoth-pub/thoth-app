import { StylesCacheProvider, ThemeProvider } from '@/providers';

const Providers = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <StylesCacheProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </StylesCacheProvider>
  );
};

export default Providers;
