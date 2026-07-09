import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';
import AddReference from '../AddReference/AddReference';
import EditReference from '../EditReference/EditReference';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

vi.mock('@/src/entities/reference', () => ({
  useReferenceStateMachine: vi.fn(() => ({
    activeEntity: { id: 'r1', url: '', doi: '', unstructuredCitation: '', orderNumber: 1 },
    update: vi.fn(),
    finishEditing: vi.fn(),
  })),
  useCreateReference: vi.fn(() => ({ createReference: vi.fn() })),
  useUpdateReference: vi.fn(() => ({ updateReference: vi.fn() })),
  EditReferenceForm: vi.fn(({ url, ...props }) => <div {...props}>EditReferenceForm:{url}</div>),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: vi.fn(() => ({
    work: { id: 'w1', references: [] },
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

describe('ReferenceFeature', () => {
  it('renders AddReference', () => {
    const { container } = render(<Wrapper><AddReference workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditReference', () => {
    const { container } = render(<Wrapper><EditReference workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });
});
