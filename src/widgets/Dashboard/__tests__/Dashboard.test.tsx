import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: vi.fn(({ children, ...props }) => <a {...props}>{children}</a>),
}));

vi.mock('@/src/entities/book', () => ({
  useBooksCount: vi.fn(() => ({ bookCount: 100, isFetched: true })),
  usePublishedBooksCount: vi.fn(() => ({ bookCount: 60, isFetched: true })),
  useForthcomingBooksCount: vi.fn(() => ({ bookCount: 30, isFetched: true })),
  useLatestPublishedBooks: vi.fn(() => ({ books: [] })),
  useLatestUpdatedBooks: vi.fn(() => ({ books: [] })),
  ChartWrapper: vi.fn(({ children }) => <div>{children}</div>),
  SectionWrapper: vi.fn(({ children, title }) => <div data-testid="section-wrapper">{title}{children}</div>),
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

import Dashboard from '../Dashboard';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('Dashboard', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><Dashboard /></Wrapper>
    );
    expect(container).toMatchSnapshot('Dashboard');
  });
});
