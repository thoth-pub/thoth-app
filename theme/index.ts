import { createTheme } from '@mui/material';

export const theme = createTheme({
  typography: {
    fontFamily: 'var(--font-open-sans), sans-serif',
    body1: {
      fontWeight: 400,
      fontSize: '1rem',
      lineHeight: '1.5',
      letterSpacing: '0.025rem',
      color: 'var(--color-typography-alt)',
    },
    body2: {
      fontWeight: 400,
      fontSize: '0.875rem',
      lineHeight: '1.125',
      letterSpacing: '0.025rem',
      color: 'var(--color-typography-alt)',
    },
  },
  palette: {
    primary: {
      main: '#744d82',
    },
  },
  components: {
    MuiLink: {
      styleOverrides: {
        root: {
          textDecoration: 'underline',
          fontWeight: 700,
          fontStyle: 'bold',
          color: 'var(--color-link)',
        },
      },
    },
  },
});
