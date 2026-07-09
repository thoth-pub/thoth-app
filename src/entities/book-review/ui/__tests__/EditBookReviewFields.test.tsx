import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

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

import { EditBookReviewAuthorName } from '../EditBookReviewAuthorName/EditBookReviewAuthorName';
import { EditBookReviewDoi } from '../EditBookReviewDoi/EditBookReviewDoi';
import { EditBookReviewJournalIssn } from '../EditBookReviewJournalIssn/EditBookReviewJournalIssn';
import { EditBookReviewJournalName } from '../EditBookReviewJournalName/EditBookReviewJournalName';
import { EditBookReviewJournalNumber } from '../EditBookReviewJournalNumber/EditBookReviewJournalNumber';
import { EditBookReviewJournalVolume } from '../EditBookReviewJournalVolume/EditBookReviewJournalVolume';
import { EditBookReviewPageRange } from '../EditBookReviewPageRange/EditBookReviewPageRange';
import { EditBookReviewReviewDate } from '../EditBookReviewReviewDate/EditBookReviewReviewDate';
import { EditBookReviewReviewerOrcid } from '../EditBookReviewReviewerOrcid/EditBookReviewReviewerOrcid';
import { EditBookReviewText } from '../EditBookReviewText/EditBookReviewText';
import { EditBookReviewTitle } from '../EditBookReviewTitle/EditBookReviewTitle';
import { EditBookReviewUrl } from '../EditBookReviewUrl/EditBookReviewUrl';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}><ThemeProvider theme={theme}>{children}</ThemeProvider></QueryClientProvider>;
}

describe('EditBookReviewFields', () => {
  it('renders EditBookReviewAuthorName', () => {
    const { container } = render(<Wrapper><EditBookReviewAuthorName workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditBookReviewDoi', () => {
    const { container } = render(<Wrapper><EditBookReviewDoi workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditBookReviewJournalIssn', () => {
    const { container } = render(<Wrapper><EditBookReviewJournalIssn workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditBookReviewJournalName', () => {
    const { container } = render(<Wrapper><EditBookReviewJournalName workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditBookReviewJournalNumber', () => {
    const { container } = render(<Wrapper><EditBookReviewJournalNumber workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditBookReviewJournalVolume', () => {
    const { container } = render(<Wrapper><EditBookReviewJournalVolume workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditBookReviewPageRange', () => {
    const { container } = render(<Wrapper><EditBookReviewPageRange workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditBookReviewReviewDate', () => {
    const { container } = render(<Wrapper><EditBookReviewReviewDate workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditBookReviewReviewerOrcid', () => {
    const { container } = render(<Wrapper><EditBookReviewReviewerOrcid workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditBookReviewText', () => {
    const { container } = render(<Wrapper><EditBookReviewText workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditBookReviewTitle', () => {
    const { container } = render(<Wrapper><EditBookReviewTitle workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditBookReviewUrl', () => {
    const { container } = render(<Wrapper><EditBookReviewUrl workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });
});
