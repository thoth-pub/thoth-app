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
  useDefaultLocaleOption: vi.fn(() => ({ value: 'en', label: 'English' })),
  useDefaultPlace: vi.fn(() => ''),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => true),
  useDebouncedValue: vi.fn((v: unknown) => v),
  useActiveLocale: vi.fn(() => 'en'),
  useCurrentActiveLocale: vi.fn(() => 'en'),
  useQueryToken: vi.fn(() => 'test-token'),
  useProgress: vi.fn(() => ({ progress: null, startProgress: vi.fn(), setProgress: vi.fn(), resetProgress: vi.fn() })),
  usePreventInteraction: vi.fn(),
  usePreventNavigation: vi.fn(),
  useEntityList: vi.fn(() => ({ items: [], activePage: 1, totalPages: 1, direction: 'ASC', orderBy: 'UPDATED_AT', searchValue: '', debouncedValue: '', changePage: vi.fn(), changeDirection: vi.fn(), changeOrderBy: vi.fn(), changeSearchValue: vi.fn(), refetch: vi.fn() })),
  useFilterSearchParams: vi.fn(() => ({ items: [], activePage: 1, totalPages: 1, direction: 'ASC', orderBy: 'UPDATED_AT', searchValue: '', debouncedValue: '', changePage: vi.fn(), changeDirection: vi.fn(), changeOrderBy: vi.fn(), changeSearchValue: vi.fn(), extraState: {}, changeExtra: {}, refetch: vi.fn() })),
  useIsDeutchLocale: vi.fn(() => false),
  useIsDragStarted: vi.fn(() => false),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: vi.fn(() => ({
    work: { id: 'w1', reference: '', landingPage: '', lccn: '', oclc: '', withdrawDate: null },
    updateWork: vi.fn(),
  })),
}));

import EditInternalId from '../EditInternalId/EditInternalId';
import EditLandingPage from '../EditLandingPage/EditLandingPage';
import EditLccn from '../EditLccn/EditLccn';
import EditOclc from '../EditOclc/EditOclc';
import EditWithdrawDate from '../EditWithdrawDate/EditWithdrawDate';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditWorkFields', () => {
  it('renders EditInternalId', () => {
    const { container } = render(<Wrapper><EditInternalId workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditLandingPage', () => {
    const { container } = render(<Wrapper><EditLandingPage workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditLccn', () => {
    const { container } = render(<Wrapper><EditLccn workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditOclc', () => {
    const { container } = render(<Wrapper><EditOclc workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditWithdrawDate', () => {
    const { container } = render(<Wrapper><EditWithdrawDate workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });
});
