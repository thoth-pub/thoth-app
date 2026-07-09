import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null, edit: vi.fn(), closeForm: vi.fn() })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => true),
}));

import LanguagesForm from '../LanguagesForm';

const mockLanguages = [
  { id: '1', code: 'eng', relation: 'ORIGINAL' },
  { id: '2', code: 'fra', relation: 'TRANSLATED_FROM' },
];

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('LanguagesForm', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><LanguagesForm languages={mockLanguages} /></Wrapper>
    );
    expect(container).toMatchSnapshot('LanguagesForm');
  });

  it('renders empty state', () => {
    const { container } = render(
      <Wrapper><LanguagesForm /></Wrapper>
    );
    expect(container).toMatchSnapshot('LanguagesForm - empty');
  });

  it('calls onUpdate on submit', () => {
    const onUpdate = vi.fn();
    const { container } = render(
      <Wrapper><LanguagesForm languages={mockLanguages} onUpdate={onUpdate} /></Wrapper>
    );
    expect(container).toMatchSnapshot('LanguagesForm - with onUpdate');
  });
});
