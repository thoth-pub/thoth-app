import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../useAddNewPublisher', () => ({
  useAddNewPublisher: vi.fn(() => ({
    isOpen: false,
    control: {},
    submitDisabled: false,
    openModal: vi.fn(),
    closeModal: vi.fn(),
    createNewPublisher: vi.fn(),
    handleSubmit: vi.fn(() => vi.fn()),
  })),
}));

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

import AddNewPublisher from '../AddNewPublisher';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('AddNewPublisher', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><AddNewPublisher /></Wrapper>
    );
    expect(container).toMatchSnapshot('AddNewPublisher');
  });
});
