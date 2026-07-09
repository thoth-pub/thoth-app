import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material';
import { useForm } from 'react-hook-form';

import CheckboxFormField from './CheckboxFormField';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={createTheme()}>{children}</ThemeProvider>;
}

function TestForm() {
  const { control } = useForm({ defaultValues: { testField: false } });

  return (
    <Wrapper>
      <CheckboxFormField control={control} name="testField" />
    </Wrapper>
  );
}

describe('CheckboxFormField', () => {
  it('renders a checkbox input', () => {
    const { container } = render(<TestForm />);
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox).toBeTruthy();
    expect((checkbox as HTMLInputElement)?.checked).toBe(false);
  });
});
