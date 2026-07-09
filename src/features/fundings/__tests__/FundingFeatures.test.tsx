import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';
import AddFunding from '../AddFunding/AddFunding';
import EditFunding from '../EditFunding/EditFunding';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

vi.mock('@/src/features/fundings/AddFunding/useAddFunding', () => ({
  useAddFunding: vi.fn(() => ({
    funding: { grantNumber: '123', program: 'Test', projectName: 'Test Project', projectShortname: 'TP', institutionId: 'inst1', institutionName: 'Test Institution' },
    finishEditing: vi.fn(),
    create: vi.fn(),
    updateProject: vi.fn(),
    updateProjectShortName: vi.fn(),
    updateProgram: vi.fn(),
    updateGrantNumber: vi.fn(),
    updateInstitution: vi.fn(),
  })),
}));

vi.mock('@/src/features/fundings/EditFunding/useEditFunding', () => ({
  useEditFunding: vi.fn(() => ({
    activeFunding: { grantNumber: '456', program: 'Edit', projectName: 'Edit Project', projectShortname: 'EP', institutionId: 'inst2', institutionName: 'Edit Institution' },
    finishEditing: vi.fn(),
    updateProject: vi.fn(),
    updateProjectShortName: vi.fn(),
    updateProgram: vi.fn(),
    updateGrantNumber: vi.fn(),
    updateInstitution: vi.fn(),
  })),
}));

vi.mock('@/src/entities/funding', () => ({
  EditGrantNumberForm: vi.fn(() => <div>EditGrantNumberForm</div>),
  EditProgramForm: vi.fn(() => <div>EditProgramForm</div>),
  EditProjectNameForm: vi.fn(() => <div>EditProjectNameForm</div>),
  EditProjectShortNameForm: vi.fn(() => <div>EditProjectShortNameForm</div>),
}));

vi.mock('@/src/entities/institution', () => ({
  EditInstitutionForm: vi.fn(() => <div>EditInstitutionForm</div>),
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

describe('FundingFeature', () => {
  it('renders AddFunding', () => {
    const { container } = render(<Wrapper><AddFunding workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditFunding', () => {
    const { container } = render(<Wrapper><EditFunding workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });
});
