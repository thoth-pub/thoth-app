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

import EditProgramForm from '../EditProgramForm';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditProgramForm', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditProgramForm /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditProgramForm');
  });

  it('renders with defaultValue', () => {
    const { container } = render(
      <Wrapper><EditProgramForm defaultValue="Research Program" /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditProgramForm - with value');
  });

  it('calls onUpdate on submit', () => {
    const onUpdate = vi.fn();
    const { container } = render(
      <Wrapper><EditProgramForm defaultValue="Research Program" onUpdate={onUpdate} /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditProgramForm - with onUpdate');
  });
});
