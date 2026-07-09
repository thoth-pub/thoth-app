import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/entities/book', () => ({
  ChartWrapper: vi.fn(({ children }) => <div>{children}</div>),
  useBooksCount: vi.fn(() => ({ bookCount: 0, isFetched: true })),
}));

vi.mock('@/src/entities/publisher', () => ({
  usePublisherStateMachine: vi.fn(() => ({ activePublisher: { id: 'pub-1' } })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useIsDesktop: vi.fn(() => true),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useEscapeKey: vi.fn(),
}));

vi.mock('../useBooksCountByMonth', () => ({
  useBooksCountByMonth: vi.fn(() => ({ bookCount: 0, isFetched: true })),
}));

import PublishedBooksChart from '../PublishedBooksChart';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('PublishedBooksChart', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><PublishedBooksChart /></Wrapper>
    );
    expect(container).toMatchSnapshot('PublishedBooksChart');
  });
});
