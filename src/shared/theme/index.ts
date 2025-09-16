import { createTheme } from '@mui/material';
import type {} from '@mui/x-date-pickers/themeAugmentation';

export const theme = createTheme({
  typography: {
    fontFamily: 'var(--font-open-sans), sans-serif',
    h1: {
      fontFamily: 'var(--font-economica), sans-serif',
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: '1.26',
      letterSpacing: 'var(--default-letter-spacing)',
      verticalAlign: 'middle',
      textTransform: 'uppercase',
    },
    h2: {
      fontFamily: 'var(--font-economica), sans-serif',
      fontWeight: 700,
      fontSize: '1.375rem',
      lineHeight: '1.26',
      letterSpacing: 'var(--default-letter-spacing)',
    },
    body1: {
      fontWeight: 400,
      fontSize: '1rem',
      lineHeight: 'var(--default-line-height)',
      letterSpacing: 'var(--default-letter-spacing)',
      color: 'var(--color-typography)',
    },
    body2: {
      fontWeight: 400,
      fontSize: '0.875rem',
      lineHeight: '1.125',
      letterSpacing: 'var(--default-letter-spacing)',
      color: 'var(--color-typography)',
    },
    button: {
      fontWeight: 400,
      fontSize: '1rem',
      lineHeight: 'var(--default-line-height)',
      letterSpacing: 'var(--default-letter-spacing)',
      color: 'var(--color-typography)',
    },
  },
  palette: {
    primary: {
      main: '#744d82',
    },
    error: {
      main: '#ff0000',
    },
    success: {
      main: '#42b072',
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
        outlined: {
          boxSizing: 'border-box',
          border: '1px solid var(--color-button-outlined-border)',
          height: '2.77rem',
        },
        text: {
          padding: 0,
          fontSize: '1rem',
          lineHeight: '1.5rem',
          fontWeight: 400,
        },
        sizeSmall: {
          lineHeight: 'var(--default-line-height)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          fontWeight: 400,
          fontSize: '1rem',
          lineHeight: 'var(--default-line-height)',
          letterSpacing: '0.025rem',
          color: 'var(--color-text-field-text)',
          '& .MuiInputBase-root': {
            height: '2.75rem',
            backgroundColor: 'var(--color-text-field-background)',
            '& fieldset': {
              border: '1px solid var(--color-text-field-border)',
            },
          },
          '& .MuiInputBase-root:hover': {
            '& fieldset': {
              borderColor: 'var(--color-text-field-border)',
            },
          },
          '& .Mui-error.MuiInputBase-root:hover': {
            '& fieldset': {
              borderColor: 'var(--color-text-field-error)',
            },
          },
          '& .MuiInputBase-input': {
            height: '2.75rem',
            padding: '0 0.625rem',
          },
          '& .MuiIconButton-root': {
            color: 'var(--color-text-field-text)',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: '1rem',
          lineHeight: 'var(--default-line-height)',
          letterSpacing: 'var(--default-letter-spacing)',
          color: 'var(--color-form-field-label)',
        },
      },
    },
    MuiPickersTextField: {
      styleOverrides: {
        root: {
          fontWeight: 400,
          fontSize: '1rem',
          lineHeight: '1.5',
          letterSpacing: '0.025rem',
          color: 'var(--color-text-field-text)',
          backgroundColor: 'var(--color-text-field-background)',
          '& .MuiPickersSectionList-root ': {
            height: '2.75rem',
            padding: '0.625rem 0',
            opacity: 1,
          },
          '& .MuiIconButton-root': {
            color: 'var(--color-icon)',
          },
          '& .MuiPickersInputBase-root': {
            '& fieldset': {
              border: '1px solid var(--color-text-field-border)',
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: 'var(--color-icon-button)',
          height: '2rem',
          width: '2rem',
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          border: '2px solid var(--color-switch)',
          color: 'var(--color-switch)',
        },
        sizeSmall: {
          padding: '0.1875rem',
          borderRadius: '2.125rem',
          color: 'var(--color-switch)',
          scale: '0.6',

          '& .MuiSwitch-switchBase': {
            padding: '0.125rem',
          },
        },
        track: {
          backgroundColor: 'transparent',
        },
        thumb: {
          backgroundColor: 'var(--color-switch)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--color-chip-background)',
          color: 'var(--color-chip-text)',
          fontWeight: 600,
          fontSize: '0.875rem',
          lineHeight: '1.125rem',
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          borderColor: 'var(--color-table-border)',
          '& .MuiTableCell-root': {
            borderColor: 'var(--color-table-border)',
            color: 'var(--color-table-text)',
            fontSize: '1rem',
            lineHeight: '1.5rem',
          },
          '& .MuiTableCell-root.MuiTableCell-body': {
            borderColor: 'transparent',
          },
          '& .MuiTableBody-root': {
            '& .MuiTableRow-root:hover': {
              backgroundColor: 'var(--color-table-row-hover-background)',
              cursor: 'pointer',
            },
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'var(--color-tooltip-background)',
          border: '1px solid var(--color-tooltip-border)',
          boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
          padding: '0.25rem',
          '& .MuiTooltip-arrow': {
            '&:before': {
              border: '1px solid var(--color-tooltip-border)',
            },
            color: 'var(--color-tooltip-background)',
          },
        },
      },
    },
  },
});
