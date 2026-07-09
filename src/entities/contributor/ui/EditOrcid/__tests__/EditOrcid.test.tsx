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

import EditOrcid from '../EditOrcid';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditOrcid', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditOrcid onSubmit={vi.fn()} /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditOrcid');
  });

  it('renders with orcidId', () => {
    const { container } = render(
      <Wrapper><EditOrcid orcidId="0000-0002-1234-5678" onSubmit={vi.fn()} /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditOrcid - with value');
  });

  it('renders disabled', () => {
    const { container } = render(
      <Wrapper><EditOrcid orcidId="0000-0002-1234-5678" disabled onSubmit={vi.fn()} /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditOrcid - disabled');
  });
});
