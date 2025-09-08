import { ThemeProvider as MuiThemeProvider } from '@mui/material';
import type { PropsWithChildren } from 'react';

import { theme } from '@/src/shared/theme';

function ThemeProvider({ children }: PropsWithChildren) {
  return <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>;
}

export default ThemeProvider;
