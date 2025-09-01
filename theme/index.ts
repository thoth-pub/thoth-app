import { createTheme } from '@mui/material';

export const theme = createTheme({
  typography: {
    fontFamily: 'var(--font-open-sans), sans-serif',
    h1: {
      fontFamily: 'var(--font-economica), sans-serif',
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: '1.26',
      letterSpacing: '0.025rem',
      verticalAlign: 'middle',
      textTransform: 'uppercase',
    },
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
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '0.625rem 1.25rem ',
          textTransform: 'none',
          fontWeight: 700,
          fontStyle: 'bold',
          fontSize: '1rem',
          lineHeight: '1.66',
          borderRadius: 'var(--border-button-radius)',
        },
        contained: {
          backgroundColor: 'var(--color-button-contained-background)',
          color: 'var(--color-button-contained-text)',
        },
      },
    },
  },
});
