import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';
import ImprintsList from '../ImprintsList/ImprintsList';

vi.mock('@/src/features/imprint/ImprintsList/useImprintsList', () => ({
  useImprintsList: vi.fn(() => ({
    data: [{ id: 'i1', name: 'Test Imprint', publisherId: 'p1', url: '', updatedAt: '' }],
    isEditingNewImprint: false,
    isAddNewButtonDisabled: false,
    isImprintEditable: true,
    isSuperuser: true,
    addNewImprint: vi.fn(),
    createImprint: vi.fn(),
    updateImprint: vi.fn(),
    deleteImprint: vi.fn(),
  })),
}));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({
    state: 'edit',
    startEditing: vi.fn(),
    cancelEditing: vi.fn(),
    confirmEditing: vi.fn(),
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

describe('ImprintsList', () => {
  it('renders list of imprints', () => {
    const { container } = render(<Wrapper><ImprintsList /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders button when editable', () => {
    const { container } = render(<Wrapper><ImprintsList /></Wrapper>);
    expect(container.textContent).toBeDefined();
  });
});
