import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';
import CreateWorkCopy from './CreateWorkCopy';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

vi.mock('@/src/entities/book', () => ({
  useBooks: vi.fn(() => ({
    books: [],
    loading: false,
  })),
}));

vi.mock('@/src/entities/publisher', () => ({
  usePublisherStateMachine: vi.fn(() => ({
    linkedPublishers: [{ id: 'p1' }],
    activePublisher: { id: 'p1', name: 'Test' },
  })),
}));

vi.mock('@/src/entities/work', () => ({
  useCreateNewWorkEdition: vi.fn(() => ({ createNewWorkEdition: vi.fn(), loading: false })),
  useCreateWorkTranslation: vi.fn(() => ({ createWorkTranslation: vi.fn(), loading: false })),
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
    linkedPublishers: [{ id: 'p1' }],
  })),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}><ThemeProvider theme={theme}>{children}</ThemeProvider></QueryClientProvider>;
}

describe('CreateWorkCopy', () => {
  it('renders for translation mode', () => {
    const { container } = render(<Wrapper><CreateWorkCopy isTranslation={true} /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders for edition mode', () => {
    const { container } = render(<Wrapper><CreateWorkCopy isTranslation={false} /></Wrapper>);
    expect(container).toBeDefined();
  });
});