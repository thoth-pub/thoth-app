import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: vi.fn(() => ({ activePublisher: { id: 'pub-1', name: 'Test Publisher' } })),
}));

vi.mock('@/src/entities/work', () => ({
  useWorks: vi.fn(() => ({ works: [], loading: false, isFetched: true })),
  useWorksCount: vi.fn(() => ({ workCount: 0 })),
  useCreateNewWorkEdition: vi.fn(() => ({ createNewWorkEdition: vi.fn() })),
  useCreateWorkTranslation: vi.fn(() => ({ createWorkTranslation: vi.fn() })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useFilterSearchParams: vi.fn(() => ({
    activePage: 1,
    direction: 'ASC',
    orderBy: 'UPDATED_AT_WITH_RELATIONS',
    searchValue: '',
    debouncedValue: '',
    offset: 0,
    limit: 20,
    changeSearchValue: vi.fn(),
    changePage: vi.fn(),
    changeDirection: vi.fn(),
    changeOrderBy: vi.fn(),
    extraState: { workStatus: 'All', workType: 'All' },
    changeExtra: { workStatus: vi.fn(), workType: vi.fn() },
  })),
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
}));

import AllWorks from '../AllWorks';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('AllWorks', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><AllWorks /></Wrapper>
    );
    expect(container).toMatchSnapshot('AllWorks');
  });
});
