import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'errors.titleRequired' ? 'Title is required' : key),
  }),
}));

import FormTextField from './FormTextField';

const STATIC_HELPER_TEXT = 'doi.helperText';
const LITERAL_VALIDATION_ERROR = 'Invalid DOI format (expected https://doi.org/10.xxxx/xxxxx)';
const KEYED_VALIDATION_ERROR = 'errors.titleRequired';
const TRANSLATED_VALIDATION_ERROR = 'Title is required';

afterEach(cleanup);

type TestFormValues = {
  doi: string;
};

function TestForm({ validationError }: { validationError?: string }) {
  const { control, handleSubmit } = useForm<TestFormValues>({
    defaultValues: { doi: '' },
    resolver: async (values) => ({
      values: validationError ? {} : values,
      errors: validationError
        ? {
            doi: {
              type: 'validate',
              message: validationError,
            },
          }
        : {},
    }),
  });

  return (
    <ThemeProvider theme={createTheme()}>
      <form onSubmit={handleSubmit(() => undefined)}>
        <FormTextField control={control} name="doi" helperText={STATIC_HELPER_TEXT} />
        <button type="submit">Validate</button>
      </form>
    </ThemeProvider>
  );
}

describe('FormTextField', () => {
  it('FormTextField_translatesKeyedValidationError', async () => {
    const user = userEvent.setup();
    render(<TestForm validationError={KEYED_VALIDATION_ERROR} />);

    await user.click(screen.getByRole('button', { name: 'Validate' }));

    expect(await screen.findByText(TRANSLATED_VALIDATION_ERROR)).toBeVisible();
    expect(screen.queryByText(KEYED_VALIDATION_ERROR)).not.toBeInTheDocument();
    expect(screen.queryByText(STATIC_HELPER_TEXT)).not.toBeInTheDocument();
  });

  it('FormTextField_preservesLiteralValidationError', async () => {
    const user = userEvent.setup();
    render(<TestForm validationError={LITERAL_VALIDATION_ERROR} />);

    await user.click(screen.getByRole('button', { name: 'Validate' }));

    expect(await screen.findByText(LITERAL_VALIDATION_ERROR)).toBeVisible();
    expect(screen.queryByText(STATIC_HELPER_TEXT)).not.toBeInTheDocument();
  });

  it('FormTextField_preservesStaticHelperTextWhenNoValidationError', () => {
    render(<TestForm />);

    expect(screen.getByText(STATIC_HELPER_TEXT)).not.toBeVisible();
  });
});
