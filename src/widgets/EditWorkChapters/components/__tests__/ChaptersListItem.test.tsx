import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
}));

import { ChaptersListItem } from '../ChaptersListItem';

const mockChapter = {
  id: 'ch1',
  titles: [{ id: 't1', title: 'Chapter 1', fullTitle: 'Chapter 1 Full', subtitle: '', localeCode: 'en', canonical: true }],
  pageCount: 20,
  contributions: [{ id: 'c1', fullName: 'Author A' }],
  firstPage: '1',
  lastPage: '20',
  doi: '10.1234/test',
  landingPage: 'https://example.com',
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('ChaptersListItem', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <ChaptersListItem chapter={mockChapter as any} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('ChaptersListItem');
  });

  it('renders with callbacks', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onCopy = vi.fn();
    const { container } = render(
      <Wrapper>
        <ChaptersListItem chapter={mockChapter as any} onEdit={onEdit} onDelete={onDelete} onCopy={onCopy} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('ChaptersListItem - with callbacks');
  });
});
