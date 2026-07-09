import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';
import AddAward from '../AddAward/AddAward';
import EditAward from '../EditAward/EditAward';

vi.mock('@/src/entities/award', () => ({
  useAwardStateMachine: vi.fn(() => ({
    activeEntity: { id: 'a1', title: 'Test Award', url: '', category: '', statement: '', role: null, jury: '', year: '', country: null, orderNumber: 1 },
    update: vi.fn(),
    finishEditing: vi.fn(),
  })),
  useCreateAward: vi.fn(() => ({ createAward: vi.fn() })),
  useUpdateAward: vi.fn(() => ({ updateAward: vi.fn() })),
  EditAwardForm: vi.fn(({ title, ...props }) => <div {...props}>EditAwardForm:{title}</div>),
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

describe('AwardFeature', () => {
  it('renders AddAward', () => {
    const { container } = render(<Wrapper><AddAward workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditAward', () => {
    const { container } = render(<Wrapper><EditAward workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });
});
