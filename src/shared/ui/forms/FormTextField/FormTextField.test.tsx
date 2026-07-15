import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import FormTextField from './FormTextField';

const STATIC_HELPER_TEXT = 'doi.helperText';
const VALIDATION_ERROR = 'Invalid DOI format';

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
  it('FormTextField_showsValidationErrorMessageInsteadOfStaticHelperText', async () => {
    const user = userEvent.setup();
    render(<TestForm validationError={VALIDATION_ERROR} />);

    await user.click(screen.getByRole('button', { name: 'Validate' }));

    expect(await screen.findByText(VALIDATION_ERROR)).toBeVisible();
    expect(screen.queryByText(STATIC_HELPER_TEXT)).not.toBeInTheDocument();
  });

  it('FormTextField_preservesStaticHelperTextWhenNoValidationError', () => {
    render(<TestForm />);

    expect(screen.getByText(STATIC_HELPER_TEXT)).not.toBeVisible();
  });
});
