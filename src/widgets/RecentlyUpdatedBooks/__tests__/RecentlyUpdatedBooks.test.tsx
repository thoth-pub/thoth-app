import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

const mockUseLatestUpdatedBooks = vi.hoisted(() => vi.fn(() => ({ books: [] })));

vi.mock('@/src/entities/book', () => ({
  SectionWrapper: vi.fn(({ children, title }) => <div data-testid="section-wrapper">{title}{children}</div>),
  useLatestUpdatedBooks: mockUseLatestUpdatedBooks,
}));

vi.mock('@/src/entities/publisher', () => ({
  usePublisherStateMachine: vi.fn(() => ({ activePublisher: { id: 'pub-1' } })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useIsDesktop: vi.fn(() => true),
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useEscapeKey: vi.fn(),
}));

import RecentlyUpdatedBooks from '../RecentlyUpdatedBooks';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('RecentlyUpdatedBooks', () => {
  it('returns null when no books', () => {
    mockUseLatestUpdatedBooks.mockReturnValue({ books: [] });
    const { container } = render(
      <Wrapper><RecentlyUpdatedBooks /></Wrapper>
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders with books', () => {
    mockUseLatestUpdatedBooks.mockReturnValue({
      books: [{
        id: '1',
        titles: [{ id: 't1', title: 'Updated Book', fullTitle: 'Updated Book', subtitle: '', localeCode: 'en', canonical: true }],
        type: 'MONOGRAPH',
        status: 'ACTIVE',
        contributions: [],
        coverUrl: null,
      }],
    });
    const { container } = render(
      <Wrapper><RecentlyUpdatedBooks /></Wrapper>
    );
    expect(container).toMatchSnapshot('RecentlyUpdatedBooks');
  });
});
