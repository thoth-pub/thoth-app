import { ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

import { WorkCardListItem } from '../components/WorkCardListItem';
import { WorksCardList } from '../components/WorksCardList';

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
}));

const mockWork = {
  id: '1',
  reference: 'REF-001',
  titles: [{ id: 't1', title: 'Test Book', fullTitle: 'Test Book Full', subtitle: '', localeCode: 'en', canonical: true }],
  status: 'ACTIVE' as const,
  type: 'MONOGRAPH' as const,
  contributions: [{ id: 'c1', isMain: true, fullName: 'Author A' }],
  updatedAt: '2024-01-15T00:00:00Z',
  coverUrl: null,
};

const mockWorks = [mockWork];

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('WorksCardList', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <WorksCardList
          loading={false}
          works={mockWorks}
          page={1}
          pagesCount={1}
          onPageChange={vi.fn()}
          navigateToWork={vi.fn()}
          onCreateNewEdition={vi.fn()}
          onCreateTranslation={vi.fn()}
        />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('WorksCardList');
  });

  it('renders empty state when no works', () => {
    const { container } = render(
      <Wrapper>
        <WorksCardList
          loading={false}
          works={[]}
          page={1}
          pagesCount={0}
          onPageChange={vi.fn()}
          navigateToWork={vi.fn()}
          onCreateNewEdition={vi.fn()}
          onCreateTranslation={vi.fn()}
        />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('WorksCardList - empty');
  });
});

describe('WorkCardListItem', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <WorkCardListItem
          work={mockWork}
          navigateToWork={vi.fn()}
          createNewEdition={vi.fn()}
          createTranslation={vi.fn()}
        />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('WorkCardListItem');
  });

  it('renders Untitled when work has no title', () => {
    render(
      <Wrapper>
        <WorkCardListItem
          work={{ ...mockWork, titles: [] }}
          navigateToWork={vi.fn()}
          createNewEdition={vi.fn()}
          createTranslation={vi.fn()}
        />
      </Wrapper>
    );

    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });
});
