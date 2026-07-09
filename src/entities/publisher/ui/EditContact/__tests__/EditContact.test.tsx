import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: vi.fn(() => ({ activePublisher: { id: 'pub-1', name: 'Test Publisher' } })),
}));
vi.mock('@/src/entities/publisher/api/hooks/usePublisher', () => ({
  default: vi.fn(() => ({
    publisher: { id: 'pub-1', name: 'Test Publisher', contacts: [{ id: 'c1', type: 'MANAGING_EDITOR', email: 'editor@test.com' }] },
  })),
}));
vi.mock('@/src/entities/publisher/api/hooks/useCreateContact', () => ({
  default: vi.fn(() => ({ createContact: vi.fn() })),
}));
vi.mock('@/src/entities/publisher/api/hooks/useDeleteContact', () => ({
  default: vi.fn(() => ({ deleteContact: vi.fn(), loading: false })),
}));
vi.mock('@/src/entities/user', () => ({
  useUser: vi.fn(() => ({ user: { email: 'user@test.com' } })),
}));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ closeForm: vi.fn() })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => true),
}));

import EditContact from '../EditContact';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditContact', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditContact /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditContact');
  });
});
