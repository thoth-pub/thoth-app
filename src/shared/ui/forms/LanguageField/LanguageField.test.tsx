import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material';
import { useForm } from 'react-hook-form';

vi.mock('@/src/shared/ui', async () => {
  const actual = await vi.importActual('@/src/shared/ui');
  return {
    ...(actual as Record<string, unknown>),
    AutocompleteField: ({ name }: { name: string }) => <div data-testid={`af-${name}`}>AF</div>,
  };
});

import LanguageField from './LanguageField';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={createTheme()}>{children}</ThemeProvider>;
}

function TestForm() {
  const { control } = useForm({ defaultValues: { language: '' } });

  return (
    <Wrapper>
      <LanguageField control={control} languageFieldName="language" />
    </Wrapper>
  );
}

describe('LanguageField', () => {
  it('renders language label', () => {
    const { container } = render(<TestForm />);
    expect(container.textContent).toContain('language.label');
  });

  it('renders autocomplete field with correct name', () => {
    const { container } = render(<TestForm />);
    expect(container.querySelector('[data-testid="af-language"]')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      <Wrapper>
        <LanguageField control={{} as never} languageFieldName="test" className="extra-class" />
      </Wrapper>,
    );
    expect(container.querySelector('.extra-class')).toBeTruthy();
  });
});
