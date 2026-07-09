import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

vi.mock('@/src/entities/series', () => ({
  useSeriesStateMachine: vi.fn(() => ({
    activeEntity: { id: 's1', name: 'Test Series', issnPrint: '', issnDigital: '', type: 'BOOK_SERIES', issues: [], imprintId: '', imprintName: '', url: '', cfpUrl: '', description: '', updatedAt: '' },
    edit: vi.fn(),
    finishEditing: vi.fn(),
  })),
  useCreateSeries: vi.fn(() => ({ createSeries: vi.fn() })),
  useUpdateSeries: vi.fn(() => ({ updateSeries: vi.fn() })),
  useSeries: vi.fn(() => ({ series: null, loading: false, fetching: false })),
  EditSeriesForm: vi.fn(() => <div>EditSeriesForm</div>),
}));

vi.mock('@/src/entities/user', () => ({
  useUser: vi.fn(() => ({
    userImprintsOptions: [{ value: 'i1', label: 'Imprint 1' }],
  })),
}));

vi.mock('@/src/entities/publisher', () => ({
  useActivePublisherPermissions: vi.fn(() => ({
    isImprintEditable: true,
  })),
  usePublisherStateMachine: vi.fn(() => ({
    linkedPublishers: [{ id: 'p1' }],
    activePublisher: { id: 'p1', name: 'Test' },
  })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useActiveLocale: vi.fn(() => 'en'),
  useDebouncedValue: vi.fn((v) => v),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => false),
  useIsDeutchLocale: vi.fn(() => false),
  useIsDragStarted: vi.fn(() => false),
  usePreventInteraction: vi.fn(),
  usePreventNavigation: vi.fn(),
  useQueryToken: vi.fn(() => 'token'),
  useTypedTranslation: vi.fn(() => ({ t: (s: string) => s })),
  useNotifications: vi.fn(() => ({ notify: vi.fn() })),
  useDefaultCurrencyOption: vi.fn(() => null),
  useDefaultLocaleOption: vi.fn(() => null),
  useDefaultPlace: vi.fn(() => null),
}));

vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: vi.fn(() => ({
    activePublisher: { id: 'p1', name: 'Test Publisher' },
    resetLinkedPublishers: vi.fn(),
  })),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}><ThemeProvider theme={theme}>{children}</ThemeProvider></QueryClientProvider>;
}

import AddSeries from '../AddSeries/AddSeries';
import EditSeries from '../EditSeries/EditSeries';

vi.mock('../../work/EditWorkSeries/components/IssuesList', () => ({
  IssuesList: vi.fn(() => <div>IssuesList</div>),
}));

vi.mock('./components/AddBookModal', () => ({
  AddBookModal: vi.fn(() => <div>AddBookModal</div>),
}));

describe('SeriesFeatures', () => {
  it('renders AddSeries', () => {
    const { container } = render(<Wrapper><AddSeries /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditSeries', () => {
    const { container } = render(<Wrapper><EditSeries /></Wrapper>);
    expect(container).toBeDefined();
  });
});