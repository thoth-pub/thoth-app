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
  AddSet: vi.fn(() => <div data-testid="add-set" />),
}));

import { SetsHeader } from '../SetsHeader';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('SetsHeader', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <SetsHeader
          searchValue=""
          direction="ASC"
          orderBy="TITLE"
          onSearch={vi.fn()}
          changeDirection={vi.fn()}
          changeOrderBy={vi.fn()}
        />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('SetsHeader');
  });

  it('toggles filter panel', () => {
    const { container } = render(
      <Wrapper>
        <SetsHeader
          searchValue=""
          direction="ASC"
          orderBy="TITLE"
          onSearch={vi.fn()}
          changeDirection={vi.fn()}
          changeOrderBy={vi.fn()}
        />
      </Wrapper>
    );
    const filterButton = container.querySelector('[data-testid="FilterAltIcon"]')?.closest('button');
    if (filterButton) fireEvent.click(filterButton);
    expect(container).toMatchSnapshot('SetsHeader - with filters open');
  });
});
