import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/entities/work', () => ({
  useWork: vi.fn(() => ({
    work: { id: '1', titles: [{ id: 't1', title: 'Test Book', subtitle: '', fullTitle: 'Test Book', localeCode: 'en', canonical: true }], internalId: 'INT-001', status: 'ACTIVE', edition: 1, publicationDate: null, withdrawnDate: null, imprintId: 'imprint-1' },
    updateWork: vi.fn(),
  })),
  useTranslatedWorks: vi.fn(() => ({ translatedWorks: [] })),
  useWorkSet: vi.fn(() => ({ workSet: [] })),
}));

vi.mock('@/src/entities/work/api/hooks/useWork', () => ({
  default: vi.fn(() => ({
    work: { id: '1', titles: [{ id: 't1', title: 'Test Book', subtitle: '', fullTitle: 'Test Book', localeCode: 'en', canonical: true }], status: 'ACTIVE', edition: 1, publicationDate: null, withdrawnDate: null, imprintId: 'imprint-1' },
    updateWork: vi.fn(),
  })),
}));

vi.mock('@/src/entities/work/api/hooks/useWorkChapters', () => ({
  default: vi.fn(() => ({ chapters: [] })),
}));

vi.mock('@/src/entities/work/api/hooks/useWorkEditions', () => ({
  default: vi.fn(() => ({ latestEdition: null, previousEdition: null, nextEdition: null })),
}));

vi.mock('@/src/entities/work/api/hooks/useWorkTranslations', () => ({
  default: vi.fn(() => ({ translations: [] })),
}));

vi.mock('@/src/entities/user', () => ({
  useUser: vi.fn(() => ({ user: { isSuperuser: false } })),
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

import EditWorkHeader from '../EditWorkHeader';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditWorkHeader', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditWorkHeader workId="test-work-id" /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditWorkHeader');
  });
});
