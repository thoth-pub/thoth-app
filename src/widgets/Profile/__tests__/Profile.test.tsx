import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/entities/user', () => ({
  useUser: vi.fn(() => ({ user: { isSuperuser: true } })),
}));

vi.mock('@/src/entities/publisher', () => ({
  EditContact: vi.fn(() => <div data-testid="edit-contact" />),
  EditName: vi.fn(() => <div data-testid="edit-name" />),
  EditReport: vi.fn(() => <div data-testid="edit-report" />),
  EditShortname: vi.fn(() => <div data-testid="edit-shortname" />),
  EditStatement: vi.fn(() => <div data-testid="edit-statement" />),
  EditUrl: vi.fn(() => <div data-testid="edit-url" />),
  EditZitadelId: vi.fn(() => <div data-testid="edit-zitadel-id" />),
}));

vi.mock('@/src/features', () => ({
  ImprintsList: vi.fn(() => <div data-testid="imprints-list" />),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
}));

import Profile from '../Profile';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('Profile', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><Profile /></Wrapper>
    );
    expect(container).toMatchSnapshot('Profile');
  });
});
