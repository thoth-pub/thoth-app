import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';
import AddContributionModal from './AddContributionModal';

vi.mock('@/src/entities/contribution', () => ({
  useContributionStateMachine: vi.fn(() => ({
    activeEntity: null,
    edit: vi.fn(),
    finishEditing: vi.fn(),
  })),
}));

vi.mock('@/src/entities/contributor', () => ({
  useContributors: vi.fn(() => ({
    contributors: [],
    loading: false,
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
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('AddContributionModal', () => {
  it('renders without crashing', () => {
    const { container } = render(<Wrapper><AddContributionModal /></Wrapper>);
    expect(container).toBeDefined();
  });
});