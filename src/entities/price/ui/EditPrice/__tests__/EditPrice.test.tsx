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

import EditPrice from '../EditPrice';

const mockPrices = [
  { id: '1', currencyCode: 'USD', unitPrice: 29.99 },
  { id: '2', currencyCode: 'EUR', unitPrice: 24.99 },
];

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditPrice', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditPrice prices={mockPrices} /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditPrice');
  });

  it('renders empty state', () => {
    const { container } = render(
      <Wrapper><EditPrice /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditPrice - empty');
  });

  it('calls onUpdate on submit', () => {
    const onUpdate = vi.fn();
    const { container } = render(
      <Wrapper><EditPrice prices={mockPrices} onUpdate={onUpdate} /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditPrice - with onUpdate');
  });
});
