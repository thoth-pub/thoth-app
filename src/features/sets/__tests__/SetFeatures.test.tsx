import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

vi.mock('@/src/entities/sets', () => ({
  useCreateSet: vi.fn(() => ({ createSet: vi.fn() })),
  useUpdateSet: vi.fn(() => ({ updateSet: vi.fn() })),
  EditSetTitle: vi.fn(() => <div>EditSetTitle</div>),
}));

vi.mock('@/src/entities/sets/store/set.store', () => ({
  useSetStateMachine: vi.fn(() => ({
    activeEntity: { id: 'default', titles: [], type: 'BOOK_SET', updatedAt: '', imprintId: '', status: 'FORTHCOMING', edition: 1, volumesCount: 0, covers: [] },
    edit: vi.fn(),
    finishEditing: vi.fn(),
  })),
}));

vi.mock('@/src/entities/sets/api/hooks/useSet', () => ({
  default: vi.fn(() => ({
    set: { id: 's1', titles: [{ id: 't1', title: 'Test Set', isMain: true, language: 'EN' }], type: 'BOOK_SET', updatedAt: '', imprintId: 'i1', status: 'FORTHCOMING', edition: 1, volumesCount: 0, covers: [] },
  })),
}));

vi.mock('@/src/entities/sets/ui/EditSetImprint/EditSetImprint', () => ({
  default: vi.fn(() => <div>EditSetImprint</div>),
}));

vi.mock('@/src/entities/sets/ui/AddNewSetForm/AddNewSetForm', () => ({
  AddNewSetForm: vi.fn(() => <div>AddNewSetForm</div>),
}));

vi.mock('@/src/entities/user', () => ({
  useUser: vi.fn(() => ({
    userImprintsOptions: [{ value: 'i1', label: 'Imprint 1' }],
  })),
}));

vi.mock('@/src/entities/publisher', () => ({
  useActivePublisherPermissions: vi.fn(() => ({
    isImprintEditable: true,
  })),
  usePublisherStateMachine: vi.fn(() => ({
    linkedPublishers: [{ id: 'p1' }],
    activePublisher: { id: 'p1', name: 'Test' },
  })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useActiveLocale: vi.fn(() => 'en'),
  useDebouncedValue: vi.fn((v) => v),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => false),
  useIsDeutchLocale: vi.fn(() => false),
  useIsDragStarted: vi.fn(() => false),
  usePreventInteraction: vi.fn(),
  usePreventNavigation: vi.fn(),
  useQueryToken: vi.fn(() => 'token'),
  useTypedTranslation: vi.fn(() => ({ t: (s: string) => s })),
  useNotifications: vi.fn(() => ({ notify: vi.fn() })),
  useDefaultCurrencyOption: vi.fn(() => null),
  useDefaultLocaleOption: vi.fn(() => null),
  useDefaultPlace: vi.fn(() => null),
}));

vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: vi.fn(() => ({
    activePublisher: { id: 'p1', name: 'Test Publisher' },
    resetLinkedPublishers: vi.fn(),
  })),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}><ThemeProvider theme={theme}>{children}</ThemeProvider></QueryClientProvider>;
}

import AddSet from '../AddSet/AddSet';
import EditSet from '../EditSet/EditSet';

vi.mock('../EditSet/components/SetBooksList', () => ({
  SetBooksList: vi.fn(() => <div>SetBooksList</div>),
}));

describe('SetFeatures', () => {
  it('renders AddSet', () => {
    const { container } = render(<Wrapper><AddSet /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditSet', () => {
    const { container } = render(<Wrapper><EditSet setId="s1" /></Wrapper>);
    expect(container).toBeDefined();
  });
});