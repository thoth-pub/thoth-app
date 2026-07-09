import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

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
  return <QueryClientProvider client={queryClient}><ThemeProvider theme={theme}>{children}</ThemeProvider></QueryClientProvider>;
}

import { useEditFundings } from '../EditFundings/useEditFundings';
import { useEditPublications } from '../EditPublications/useEditPublications';
import { useEditReferences } from '../EditReferences/useEditReferences';
import EditFundings from '../EditFundings/EditFundings';
import EditPublications from '../EditPublications/EditPublications';
import EditReferences from '../EditReferences/EditReferences';

vi.mock('../EditFundings/useEditFundings', () => ({
  useEditFundings: vi.fn(() => ({
    fundings: [],
    activeFunding: null,
    isNewFunding: false,
    editDisabled: false,
    isFundingsRequired: false,
    isFundingsEmpty: true,
    deleteLoading: false,
    deleteFunding: vi.fn(),
    addFunding: vi.fn(),
    editFunding: vi.fn(),
  })),
}));

vi.mock('../EditPublications/useEditPublications', () => ({
  useEditPublications: vi.fn(() => ({
    publications: [],
    activePublication: null,
    isNewPublication: false,
    isDimensionFormHidden: false,
    uploadDisabled: false,
    editDisabled: false,
    deleteLoading: false,
    addPublication: vi.fn(),
    deletePublication: vi.fn(),
    editPublication: vi.fn(),
  })),
}));

vi.mock('../EditReferences/useEditReferences', () => ({
  useEditReferences: vi.fn(() => ({
    references: [],
    activeReference: null,
    isNewReference: false,
    editDisabled: false,
    loading: false,
    deleteLoading: false,
    editReference: vi.fn(),
    addReference: vi.fn(),
    dragEnd: vi.fn(),
    deleteReference: vi.fn(),
  })),
}));

describe('WorkEditFeatures', () => {
  it('renders EditFundings', () => {
    const { container } = render(<Wrapper><EditFundings workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditPublications', () => {
    const { container } = render(<Wrapper><EditPublications workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditReferences', () => {
    const { container } = render(<Wrapper><EditReferences workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });
});