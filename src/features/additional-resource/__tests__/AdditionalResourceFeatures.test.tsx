import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';
import AddAdditionalResource from '../AddAdditionalResource/AddAdditionalResource';
import EditAdditionalResource from '../EditAdditionalResource/EditAdditionalResource';

vi.mock('@/src/entities/additional-resource', () => ({
  useAdditionalResourceStateMachine: vi.fn(() => ({
    activeEntity: { id: 'ar1', title: 'Test Resource', resourceType: 'VIDEO', url: '', doi: '', handle: '', description: '', attribution: '', fileUrl: '', orderNumber: 1 },
    update: vi.fn(),
    finishEditing: vi.fn(),
  })),
  useCreateAdditionalResource: vi.fn(() => ({ createAdditionalResource: vi.fn(), loading: false, progress: 0 })),
  useUpdateAdditionalResource: vi.fn(() => ({ updateAdditionalResource: vi.fn() })),
  useUploadAdditionalResourceFile: vi.fn(() => ({ uploadAdditionalResourceFile: vi.fn() })),
  EditAdditionalResourceForm: vi.fn(({ title, ...props }) => <div {...props}>EditAdditionalResourceForm:{title}</div>),
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
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('AdditionalResourceFeature', () => {
  it('renders AddAdditionalResource', () => {
    const { container } = render(<Wrapper><AddAdditionalResource workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditAdditionalResource', () => {
    const { container } = render(<Wrapper><EditAdditionalResource workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });
});
