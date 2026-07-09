import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null, edit: vi.fn(), closeForm: vi.fn() })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useDefaultLocaleOption: vi.fn(() => ({ value: 'en', label: 'English' })),
  useDefaultPlace: vi.fn(() => ''),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => true),
  useDebouncedValue: vi.fn((v: unknown) => v),
  useActiveLocale: vi.fn(() => 'en'),
  useCurrentActiveLocale: vi.fn(() => 'en'),
  useQueryToken: vi.fn(() => 'test-token'),
  useProgress: vi.fn(() => ({ progress: null, startProgress: vi.fn(), setProgress: vi.fn(), resetProgress: vi.fn() })),
  usePreventInteraction: vi.fn(),
  usePreventNavigation: vi.fn(),
  useEntityList: vi.fn(() => ({ items: [], activePage: 1, totalPages: 1, direction: 'ASC', orderBy: 'UPDATED_AT', searchValue: '', debouncedValue: '', changePage: vi.fn(), changeDirection: vi.fn(), changeOrderBy: vi.fn(), changeSearchValue: vi.fn(), refetch: vi.fn() })),
  useFilterSearchParams: vi.fn(() => ({ items: [], activePage: 1, totalPages: 1, direction: 'ASC', orderBy: 'UPDATED_AT', searchValue: '', debouncedValue: '', changePage: vi.fn(), changeDirection: vi.fn(), changeOrderBy: vi.fn(), changeSearchValue: vi.fn(), extraState: {}, changeExtra: {}, refetch: vi.fn() })),
  useIsDeutchLocale: vi.fn(() => false),
  useIsDragStarted: vi.fn(() => false),
}));

import { EditAwardCategory } from '../EditAwardCategory/EditAwardCategory';
import { EditAwardCountry } from '../EditAwardCountry/EditAwardCountry';
import { EditAwardJury } from '../EditAwardJury/EditAwardJury';
import { EditAwardRole } from '../EditAwardRole/EditAwardRole';
import { EditAwardStatement } from '../EditAwardStatement/EditAwardStatement';
import { EditAwardTitle } from '../EditAwardTitle/EditAwardTitle';
import { EditAwardUrl } from '../EditAwardUrl/EditAwardUrl';
import { EditAwardYear } from '../EditAwardYear/EditAwardYear';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditAwardFields', () => {
  it('renders EditAwardCategory', () => {
    const { container } = render(<Wrapper><EditAwardCategory /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditAwardCountry', () => {
    const { container } = render(<Wrapper><EditAwardCountry /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditAwardJury', () => {
    const { container } = render(<Wrapper><EditAwardJury /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditAwardRole', () => {
    const { container } = render(<Wrapper><EditAwardRole /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditAwardStatement', () => {
    const { container } = render(<Wrapper><EditAwardStatement /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditAwardTitle', () => {
    const { container } = render(<Wrapper><EditAwardTitle /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditAwardUrl', () => {
    const { container } = render(<Wrapper><EditAwardUrl /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditAwardYear', () => {
    const { container } = render(<Wrapper><EditAwardYear /></Wrapper>);
    expect(container).toBeDefined();
  });
});
