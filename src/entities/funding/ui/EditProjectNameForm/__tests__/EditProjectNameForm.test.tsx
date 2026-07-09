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

import EditProjectNameForm from '../EditProjectNameForm';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditProjectNameForm', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditProjectNameForm /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditProjectNameForm');
  });

  it('renders with defaultValue', () => {
    const { container } = render(
      <Wrapper><EditProjectNameForm defaultValue="My Project" /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditProjectNameForm - with value');
  });

  it('calls onUpdate on submit', () => {
    const onUpdate = vi.fn();
    const { container } = render(
      <Wrapper><EditProjectNameForm defaultValue="My Project" onUpdate={onUpdate} /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditProjectNameForm - with onUpdate');
  });
});
