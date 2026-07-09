import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

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
  usePublisherStateMachine: vi.fn(() => ({ activePublisher: { id: 'pub-1' } })),
}));

vi.mock('@/src/entities/series', () => ({
  useSerieses: vi.fn(() => ({ serieses: [], loading: false, isFetched: true })),
  useSeriesesCount: vi.fn(() => ({ seriesCount: 0 })),
  SeriesList: vi.fn(() => <div data-testid="series-list" />),
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
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><Series /></Wrapper>
    );
    expect(container).toMatchSnapshot('Series');
  });
});
