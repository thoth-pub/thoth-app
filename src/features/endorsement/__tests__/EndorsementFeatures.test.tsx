import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';
import AddEndorsement from '../AddEndorsement/AddEndorsement';
import EditEndorsement from '../EditEndorsement/EditEndorsement';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

vi.mock('@/src/entities/endorsement', () => ({
  useEndorsementStateMachine: vi.fn(() => ({
    activeEntity: { id: 'e1', authorName: 'Test Author', authorOrcid: '', url: '', authorInstitutionId: '', authorInstitutionName: '', authorInstitutionRor: '', authorRole: null, text: '', orderNumber: 1 },
    update: vi.fn(),
    finishEditing: vi.fn(),
  })),
  useCreateEndorsement: vi.fn(() => ({ createEndorsement: vi.fn() })),
  useUpdateEndorsement: vi.fn(() => ({ updateEndorsement: vi.fn() })),
  EditEndorsementForm: vi.fn(({ authorName, ...props }) => <div {...props}>EditEndorsementForm:{authorName}</div>),
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

describe('EndorsementFeature', () => {
  it('renders AddEndorsement', () => {
    const { container } = render(<Wrapper><AddEndorsement workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditEndorsement', () => {
    const { container } = render(<Wrapper><EditEndorsement workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });
});
