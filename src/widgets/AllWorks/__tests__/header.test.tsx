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

import { Header } from '../components/Header';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('Header', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <Header
          workStatus="All"
          workType="All"
          searchValue=""
          direction="ASC"
          orderBy="UPDATED_AT_WITH_RELATIONS"
          onSearch={vi.fn()}
          changeWorkStatus={vi.fn()}
          changeWorkType={vi.fn()}
          changeDirection={vi.fn()}
          changeOrderBy={vi.fn()}
        />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('Header');
  });

  it('toggles filter panel', () => {
    const { container, getByRole } = render(
      <Wrapper>
        <Header
          workStatus="All"
          workType="All"
          searchValue=""
          direction="ASC"
          orderBy="UPDATED_AT_WITH_RELATIONS"
          onSearch={vi.fn()}
          changeWorkStatus={vi.fn()}
          changeWorkType={vi.fn()}
          changeDirection={vi.fn()}
          changeOrderBy={vi.fn()}
        />
      </Wrapper>
    );
    const filterButton = container.querySelector('[data-testid="FilterAltIcon"]')?.closest('button');
    if (filterButton) fireEvent.click(filterButton);
    expect(container).toMatchSnapshot('Header - with filters open');
  });
});
