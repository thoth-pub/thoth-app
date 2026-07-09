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

vi.mock('../../store/hooks/usePublisherStateMachine', () => ({
  default: vi.fn(() => ({
    activePublisher: { id: 'p1', name: 'Test' },
    linkedPublishers: [],
    changeActivePublisher: vi.fn(),
    resetLinkedPublishers: vi.fn(),
    setLinkedPublishers: vi.fn(),
  })),
}));

vi.mock('../../api/hooks/usePublisher', () => ({
  default: vi.fn(() => ({
    publisher: { id: 'p1', name: 'Test', accessibilityReportUrl: '', shortName: '', statement: '', url: '', zitadelId: '' },
  })),
}));

vi.mock('../../api/hooks/useUpdatePublisher', () => ({
  default: vi.fn(() => ({ updatePublisher: vi.fn() })),
}));

import EditReport from '../EditReport/EditReport';
import EditShortname from '../EditShortname/EditShortname';
import EditStatement from '../EditStatement/EditStatement';
import EditUrl from '../EditUrl/EditUrl';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}><ThemeProvider theme={theme}>{children}</ThemeProvider></QueryClientProvider>;
}

describe('EditPublisherFields', () => {
  it('renders EditReport', () => {
    const { container } = render(<Wrapper><EditReport publisherId="p1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditShortname', () => {
    const { container } = render(<Wrapper><EditShortname publisherId="p1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditStatement', () => {
    const { container } = render(<Wrapper><EditStatement publisherId="p1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditUrl', () => {
    const { container } = render(<Wrapper><EditUrl publisherId="p1" /></Wrapper>);
    expect(container).toBeDefined();
  });


});
