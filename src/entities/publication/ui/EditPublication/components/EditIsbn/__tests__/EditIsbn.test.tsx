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

import EditIsbn from '../../EditIsbn';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditIsbn', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditIsbn /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditIsbn');
  });

  it('renders with isbn value', () => {
    const { container } = render(
      <Wrapper><EditIsbn isbn="978-1-234-56789-0" /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditIsbn - with value');
  });

  it('calls onSubmit on submit', () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <Wrapper><EditIsbn isbn="978-1-234-56789-0" onSubmit={onSubmit} /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditIsbn - with onSubmit');
  });
});
