import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: vi.fn(() => ({ activePublisher: { id: 'pub-1', name: 'Test Publisher' } })),
}));
vi.mock('@/src/entities/publisher/api/hooks/usePublisher', () => ({
  default: vi.fn(() => ({ publisher: { id: 'pub-1', name: 'Test Publisher' } })),
}));
vi.mock('@/src/entities/publisher/api/hooks/useUpdatePublisher', () => ({
  default: vi.fn(() => ({ updatePublisher: vi.fn() })),
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

import EditName from '../EditName';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditName', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditName /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditName');
  });
});
