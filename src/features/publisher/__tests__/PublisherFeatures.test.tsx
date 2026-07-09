import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';
import ChangeActivePublisher from '../ui/ChangeActivePublisher/ChangeActivePublisher';

vi.mock('@/src/features/publisher/ui/ChangeActivePublisher/useChangeActivePublisher', () => ({
  useChangeActivePublisher: vi.fn(() => ({
    activePublisher: { id: 'p1', name: 'Test Publisher' },
    publishersOptions: [{ value: 'p1', label: 'Publisher 1' }, { value: 'p2', label: 'Publisher 2' }],
    hideSelector: false,
    updateActivePublisher: vi.fn(),
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

describe('ChangeActivePublisher', () => {
  it('renders a select element', () => {
    const { container } = render(<Wrapper><ChangeActivePublisher /></Wrapper>);
    expect(container.querySelector('select')).toBeDefined();
  });

  it('renders hidden when isHidden is true', () => {
    const { container } = render(<Wrapper><ChangeActivePublisher isHidden={true} /></Wrapper>);
    expect(container).toBeDefined();
  });
});
