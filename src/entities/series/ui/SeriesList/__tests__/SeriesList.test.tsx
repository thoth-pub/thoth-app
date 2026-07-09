import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/entities/series/store/series.store', () => ({
  useSeriesStateMachine: vi.fn(() => ({ activeEntity: null, edit: vi.fn() })),
}));

vi.mock('@/src/entities/series/api/hooks/useDeleteSeries', () => ({
  default: vi.fn(() => ({ deleteSeries: vi.fn(), loading: false })),
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

import SeriesList from '../SeriesList';

const mockSerieses = [
  { id: '1', name: 'Series A', type: 'BOOK_SERIES', issnPrint: null, issnDigital: null, updatedAt: '2024-01-01', issues: [] },
  { id: '2', name: 'Series B', type: 'BOOK_SERIES', issnPrint: null, issnDigital: null, updatedAt: '2024-01-02', issues: [] },
];

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('SeriesList', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <SeriesList seriesForm={<div />} loading={false} serieses={mockSerieses} page={1} pagesCount={2} onPageChange={vi.fn()} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('SeriesList');
  });

  it('renders empty state', () => {
    const { container } = render(
      <Wrapper>
        <SeriesList seriesForm={<div />} loading={false} serieses={[]} page={1} pagesCount={1} onPageChange={vi.fn()} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('SeriesList - empty');
  });
});
