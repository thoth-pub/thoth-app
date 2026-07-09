import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/features', () => ({
  EditBookLink: vi.fn(({ id, titles, type, status, contributions, image }) => (
    <div data-testid="edit-book-link" data-id={id}>{titles?.[0]?.title}</div>
  )),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
}));

import { BooksList } from '../BooksList';

const mockBooks = [{
  id: '1',
  titles: [{ id: 't1', title: 'Test Book', fullTitle: 'Test Book', subtitle: '', localeCode: 'en', canonical: true }],
  type: 'MONOGRAPH',
  status: 'ACTIVE',
  contributions: [{ id: 'c1', fullName: 'Author A', isMain: true }],
  coverUrl: null,
}];

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('BooksList (RecentlyPublishedBooks)', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><BooksList books={mockBooks} /></Wrapper>
    );
    expect(container).toMatchSnapshot('RecentlyPublishedBooks BooksList');
  });

  it('renders empty when no books', () => {
    const { container } = render(
      <Wrapper><BooksList books={[]} /></Wrapper>
    );
    expect(container.querySelector('[data-testid="edit-book-link"]')).toBeNull();
  });
});
