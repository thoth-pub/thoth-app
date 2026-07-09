import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/hooks', () => ({
  useFilterSearchParams: vi.fn(() => ({
    activePage: 1,
    direction: 'ASC',
    orderBy: 'TITLE',
    searchValue: '',
    debouncedValue: '',
    offset: 0,
    limit: 20,
    changeSearchValue: vi.fn(),
    changePage: vi.fn(),
    changeDirection: vi.fn(),
    changeOrderBy: vi.fn(),
  })),
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
}));

vi.mock('@/src/entities/publisher', () => ({
  usePublisherStateMachine: vi.fn(() => ({ activePublisher: { id: 'pub-1' } })),
  useActivePublisherPermissions: vi.fn(() => ({ isImprintEditable: true })),
}));

vi.mock('@/src/entities/sets/store/set.store', () => ({
  useSetStateMachine: vi.fn(() => ({ activeEntity: null })),
}));

vi.mock('@/src/entities/sets/api/hooks/useSets', () => ({
  default: vi.fn(() => ({ sets: [], loading: false, isFetched: true })),
}));

vi.mock('@/src/entities/sets/api/hooks/useSetsCount', () => ({
  default: vi.fn(() => ({ setsCount: 0 })),
}));

vi.mock('@/src/entities/sets/ui/SetsCardList/SetsCardList', () => ({
  default: vi.fn(() => <div data-testid="sets-card-list" />),
}));

vi.mock('@/src/features', () => ({
  EditSet: vi.fn(() => <div data-testid="edit-set" />),
  AddSet: vi.fn(() => <div data-testid="add-set" />),
}));

import Sets from '../Sets';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('Sets', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><Sets /></Wrapper>
    );
    expect(container).toMatchSnapshot('Sets');
  });
});
