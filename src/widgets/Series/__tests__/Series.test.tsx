import { ThemeProvider } from '@mui/material';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

const mocks = vi.hoisted(() => ({
  activePublisher: { id: 'pub-1' } as { id: string } | null,
  useSerieses: vi.fn(() => ({ serieses: [] as { id: string }[], loading: false, isFetched: true })),
  useSeriesesCount: vi.fn(() => ({ seriesCount: 0 })),
  SeriesList: vi.fn(() => <div data-testid="series-list" />),
}));

vi.mock('@/src/shared/hooks', () => ({
  useFilterSearchParams: vi.fn(() => ({
    activePage: 1,
    direction: 'ASC',
    orderBy: 'TITLE',
    searchValue: '',
    debouncedValue: '',
    offset: 0,
    limit: 20,
    changeSearchValue: vi.fn(),
    changePage: vi.fn(),
    changeDirection: vi.fn(),
    changeOrderBy: vi.fn(),
    extraState: { seriesType: 'All' },
    changeExtra: { seriesType: vi.fn() },
  })),
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
}));

vi.mock('@/src/entities/publisher', () => ({
  usePublisherStateMachine: vi.fn(() => ({ activePublisher: mocks.activePublisher })),
}));

vi.mock('@/src/entities/series', () => ({
  useSerieses: mocks.useSerieses,
  useSeriesesCount: mocks.useSeriesesCount,
  SeriesList: mocks.SeriesList,
}));

vi.mock('@/src/features', () => ({
  EditSeries: vi.fn(() => <div data-testid="edit-series" />),
  AddSeries: vi.fn(() => <div data-testid="add-series" />),
}));

import Series from '../Series';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('Series', () => {
  beforeEach(() => {
    mocks.activePublisher = { id: 'pub-1' };
    mocks.useSerieses.mockReset().mockReturnValue({ serieses: [], loading: false, isFetched: true });
    mocks.useSeriesesCount.mockReset().mockReturnValue({ seriesCount: 0 });
    mocks.SeriesList.mockClear();
  });

  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><Series /></Wrapper>
    );
    expect(container).toMatchSnapshot('Series');
  });

  it('Series_doesNotShowInfiniteLoadingWhenNoActivePublisher', () => {
    mocks.activePublisher = null;
    // The disabled query never fetches, so isFetched stays false and stale data may linger.
    mocks.useSerieses.mockReturnValue({ serieses: [{ id: 'stale' }], loading: false, isFetched: false });

    render(
      <Wrapper><Series /></Wrapper>,
    );

    // The list must settle into an empty, non-loading state rather than spin forever.
    const lastCall = mocks.SeriesList.mock.calls.at(-1)?.[0] as { loading: boolean; serieses: unknown[] };
    expect(lastCall.loading).toBe(false);
    expect(lastCall.serieses).toEqual([]);
    // No invalid publisher-scoped query is issued.
    expect(mocks.useSerieses).not.toHaveBeenCalledWith(expect.objectContaining({ publishersIds: [''] }));
  });

  it('Series_activePublisherKeepsExistingLoadingBehaviour', () => {
    mocks.activePublisher = { id: 'pub-1' };
    mocks.useSerieses.mockReturnValue({ serieses: [], loading: true, isFetched: false });

    render(
      <Wrapper><Series /></Wrapper>,
    );

    const lastCall = mocks.SeriesList.mock.calls.at(-1)?.[0] as { loading: boolean };
    expect(lastCall.loading).toBe(true);
  });
});
