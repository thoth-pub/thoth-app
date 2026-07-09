import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => true),
}));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null, edit: vi.fn(), closeForm: vi.fn() })),
}));

import EditPublicationDate from '../EditPublicationDate';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditPublicationDate', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditPublicationDate /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditPublicationDate');
  });

  it('renders with default value', () => {
    const { container } = render(
      <Wrapper><EditPublicationDate defaultValue="2024-01-15" /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditPublicationDate - with value');
  });

  it('calls onUpdate when submitted', () => {
    const onUpdate = vi.fn();
    const { container } = render(
      <Wrapper><EditPublicationDate defaultValue="2024-01-15" onUpdate={onUpdate} /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditPublicationDate - with onUpdate');
  });
});
