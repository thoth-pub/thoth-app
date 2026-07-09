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

import { ChaptersList } from '../ChaptersList';

const mockChapters = [
  { id: 'ch1', titles: [{ id: 't1', title: 'Chapter 1', fullTitle: 'Chapter 1', subtitle: '', localeCode: 'en', canonical: true }], pageCount: 10, contributions: [], firstPage: '1', lastPage: '10', doi: '', landingPage: null, relationId: 'r1', ordinal: 1 },
];

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('ChaptersList', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <ChaptersList chapters={mockChapters} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('ChaptersList');
  });

  it('renders empty chapters', () => {
    const { container } = render(
      <Wrapper>
        <ChaptersList chapters={[]} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('ChaptersList - empty');
  });
});
