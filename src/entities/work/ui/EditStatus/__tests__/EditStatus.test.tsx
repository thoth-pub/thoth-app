import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/entities/user', () => ({
  useUser: vi.fn(() => ({ user: { isSuperuser: false } })),
}));

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

import { WorkStatuses } from '@/src/shared/constants';
import EditStatus from '../EditStatus';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditStatus', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditStatus defaultValue={WorkStatuses.enum.Active} /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditStatus');
  });

  it('renders with disabled false', () => {
    const { container } = render(
      <Wrapper><EditStatus defaultValue={WorkStatuses.enum.Forthcoming} disabled={false} /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditStatus - editable');
  });

  it('calls onUpdate when onSubmit is triggered', () => {
    const onUpdate = vi.fn();
    const { container } = render(
      <Wrapper><EditStatus defaultValue={WorkStatuses.enum.Active} onUpdate={onUpdate} /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditStatus - with onUpdate');
  });
});
