import { render, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/hooks', () => ({
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useEscapeKey: vi.fn(),
}));

vi.mock('@/src/features', () => ({
  AddSeries: vi.fn(() => <div data-testid="add-series" />),
}));

import { SeriesHeader } from '../SeriesHeader';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('SeriesHeader', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <SeriesHeader
          seriesType="All"
          searchValue=""
          direction="ASC"
          orderBy="TITLE"
          onSearch={vi.fn()}
          changeSeriesType={vi.fn()}
          changeDirection={vi.fn()}
          changeOrderBy={vi.fn()}
        />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('SeriesHeader');
  });

  it('toggles filter panel', () => {
    const { container } = render(
      <Wrapper>
        <SeriesHeader
          seriesType="All"
          searchValue=""
          direction="ASC"
          orderBy="TITLE"
          onSearch={vi.fn()}
          changeSeriesType={vi.fn()}
          changeDirection={vi.fn()}
          changeOrderBy={vi.fn()}
        />
      </Wrapper>
    );
    const filterButton = container.querySelector('[data-testid="FilterAltIcon"]')?.closest('button');
    if (filterButton) fireEvent.click(filterButton);
    expect(container).toMatchSnapshot('SeriesHeader - with filters open');
  });
});
