import { createTheme } from '@mui/material';
import type {} from '@mui/x-date-pickers/themeAugmentation';

export const theme = createTheme({
  typography: {
    fontFamily: 'var(--font-open-sans), sans-serif',
    h1: {
      fontFamily: 'var(--font-economica), sans-serif',
      fontWeight: 700,
      fontSize: '1.5rem',
      lineHeight: '1.26',
      letterSpacing: 'var(--default-letter-spacing)',
      verticalAlign: 'middle',
      textTransform: 'uppercase',

      '@media (min-width: 1280px)': {
        fontSize: '2rem',
      },
    },
    h2: {
      fontFamily: 'var(--font-economica), sans-serif',
      fontWeight: 700,
      fontSize: '1rem',
      lineHeight: '1.26',
      letterSpacing: 'var(--default-letter-spacing)',
      textTransform: 'uppercase',

      '@media (min-width: 1280px)': {
        fontSize: '1.375rem',
      },
    },
    body1: {
      fontWeight: 400,
      fontSize: '0.75rem',
      lineHeight: 'var(--default-line-height)',
      letterSpacing: 'var(--default-letter-spacing)',
      color: 'var(--color-typography)',

      '@media (min-width: 1280px)': {
        fontSize: '1rem',
      },
    },
    body2: {
      fontWeight: 400,
      fontSize: '0.65rem',
      lineHeight: '1.125',
      letterSpacing: 'var(--default-letter-spacing)',
      color: 'var(--color-typography)',

      '@media (min-width: 1280px)': {
        fontSize: '0.875rem',
      },
    },
    button: {
      fontWeight: 400,
      fontSize: '0.75rem',
      lineHeight: 'var(--default-line-height)',
      letterSpacing: 'var(--default-letter-spacing)',
      color: 'var(--color-typography)',

      '@media (min-width: 1280px)': {
        fontSize: '1rem',
      },
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
    secondary: {
      main: '#fff2d9',
    },
    warning: {
      main: '#ffdd75',
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
          fontSize: '0.75rem',

          '@media (min-width: 1280px)': {
            fontSize: '1rem',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '0.5rem 1rem',
          textTransform: 'none',
          fontWeight: 700,
          fontStyle: 'bold',
          fontSize: '0.75rem',
          lineHeight: '1.66',
          borderRadius: 'var(--border-button-radius)',

          '&:disabled > *': {
            opacity: 0.5,
            cursor: 'not-allowed',
          },

          '@media (min-width: 1280px)': {
            padding: '0.625rem 1.25rem',
            fontSize: '1rem',
          },
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
          fontSize: '0.75rem',
          lineHeight: '1.5rem',
          fontWeight: 400,

          '@media (min-width: 1280px)': {
            fontSize: '1rem',
          },
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
          fontSize: '0.75rem',
          lineHeight: 'var(--default-line-height)',
          letterSpacing: '0.025rem',
          color: 'var(--color-text-field-text)',

          '@media (min-width: 1280px)': {
            fontSize: '1rem',
          },

          '& .MuiInputBase-root': {
            height: '2rem',
            backgroundColor: 'var(--color-text-field-background)',
            '& fieldset': {
              border: '1px solid var(--color-text-field-border)',
            },

            '@media (min-width: 1280px)': {
              height: '2.75rem',
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
            height: '2rem',
            padding: '0 0.625rem',

            '@media (min-width: 1280px)': {
              height: '2.75rem',
            },
          },

          '& .MuiIconButton-root': {
            color: 'var(--color-text-field-text)',
          },

          '& .MuiFormHelperText-root': {
            color: 'var(--color-text-field-helper-text)',
          },

          '& .MuiSelect-select': {
            height: '10px',
            textTransform: 'capitalize',
          },

          '& .MuiInputAdornment-root': {
            marginRight: '0',
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          textTransform: 'capitalize',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: '0.75rem',
          lineHeight: 'var(--default-line-height)',
          letterSpacing: 'var(--default-letter-spacing)',
          color: 'var(--color-form-field-label)',

          '@media (min-width: 1280px)': {
            fontSize: '1rem',
          },
        },
      },
    },
    MuiPickersTextField: {
      styleOverrides: {
        root: {
          fontWeight: 400,
          fontSize: '0.75rem',
          lineHeight: '1.5',
          letterSpacing: '0.025rem',
          color: 'var(--color-text-field-text)',
          backgroundColor: 'var(--color-text-field-background)',

          '@media (min-width: 1280px)': {
            fontSize: '1rem',
          },

          '& .MuiPickersSectionList-root ': {
            height: '2rem',
            padding: '0.5rem 0',
            opacity: 1,

            '@media (min-width: 1280px)': {
              height: '2.75rem',
              padding: '0.625rem 0',
            },
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
          padding: '0.125rem 0.5rem',
          backgroundColor: 'var(--color-chip-background)',
          color: 'var(--color-chip-text)',
          fontWeight: 600,
          fontSize: '0.625rem',
          lineHeight: '1.125rem',
          border: '1px solid var(--color-chip-border)',
          borderRadius: '0.5rem',
          height: '1rem',

          '@media (min-width: 1280px)': {
            padding: '0.25rem 0.75rem',
            fontSize: '0.875rem',
            borderRadius: '1rem',
            height: '2rem',
          },

          '& .MuiChip-label': {
            padding: '0',
          },

          // MUI's small Chip pairs `label { padding: 0 8px }` with
          // `deleteIcon { margin: 0 4px 0 -4px }` on a zero-padded root, so the
          // icon's negative left margin consumes the label's own right padding
          // and leaves a 4px gap, and its right margin supplies the Chip's
          // right-hand spacing. Thoth puts the horizontal gutter on the Chip
          // root and zeroes the label instead, so that negative margin has no
          // padding left to consume and lands on the label, while the right
          // margin double-counts spacing the root already provides. State the
          // same two relationships in this model: the left margin becomes the
          // label-to-icon gap outright, and the right margin is surrendered to
          // the root padding. The delete icon is a fixed 16px box either side of
          // the 1280px breakpoint, so one pair serves both regimes (#154).
          '& .MuiChip-deleteIcon': {
            marginLeft: '4px',
            marginRight: '0',
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          fontSize: '0.75rem',
          lineHeight: '1.5rem',
          borderColor: 'var(--color-table-border)',
          '@media (min-width: 1280px)': {
            fontSize: '1rem',
          },

          '& .MuiTableCell-root': {
            borderColor: 'var(--color-table-border)',
            color: 'var(--color-table-text)',
          },
          '& .MuiTableHead-root .MuiTableCell-root': {
            padding: '8px',

            '@media (min-width: 1280px)': {
              padding: '10px',
            },
          },
          '& .MuiTableCell-root.MuiTableCell-body': {
            verticalAlign: 'top',
            borderColor: 'transparent',
            padding: '12px',
          },
          '& .MuiTableBody-root': {
            // Interactive row treatment is opt-in and code-visible: only a row
            // that sets MUI's `hover` prop - and so carries `MuiTableRow-hover`
            // - claims to be interactive. A body row is otherwise informational
            // or a container for its own explicit controls, and must not
            // advertise a whole-row action it does not have (#133).
            '& .MuiTableRow-root.MuiTableRow-hover:hover': {
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
          padding: '0.75rem',
          '& .MuiTooltip-arrow': {
            '&:before': {
              border: '1px solid var(--color-tooltip-border)',
            },
            color: 'var(--color-tooltip-background)',
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          '& .MuiSvgIcon-root': {
            fill: 'var(--color-checkbox-border)',
          },
          '&.Mui-disabled': {
            '& .MuiSvgIcon-root': {
              fill: 'gray',
            },
          },
        },
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          fontSize: '0.75rem',
          color: 'var(--color-breadcrumb-text)',

          '@media (min-width: 1280px)': {
            fontSize: '1rem',
          },
        },
      },
    },
  },
});
