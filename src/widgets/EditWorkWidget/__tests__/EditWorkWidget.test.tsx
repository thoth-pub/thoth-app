import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock('@/src/entities/user', () => ({
  useUser: vi.fn(() => ({ userImprintsOptions: [{ value: 'imprint-1', label: 'Imprint 1' }], loading: false })),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: vi.fn(() => ({
    work: { id: 'w1', imprintId: 'imprint-1', titles: [], status: 'ACTIVE', edition: 1, publicationDate: null, withdrawnDate: null },
    loading: false,
  })),
  EditWorkHeader: vi.fn(() => <div data-testid="edit-work-header" />),
}));

vi.mock('@/src/entities/publisher', () => ({
  useActivePublisherPermissions: vi.fn(() => ({
    isStatusEditable: true,
    isPublicationDateEditable: true,
    isWithdrawnDateEditable: true,
  })),
}));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ closeForm: vi.fn() })),
}));

vi.mock('@/src/features', () => ({
  EditBasicDetails: vi.fn(({ children }) => <div data-testid="edit-basic-details">{children}</div>),
  EditDescriptions: vi.fn(() => <div data-testid="edit-descriptions" />),
  EditContributors: vi.fn(() => <div data-testid="edit-contributors" />),
  EditFundings: vi.fn(() => <div data-testid="edit-fundings" />),
  WorkSpeedDial: vi.fn(() => <div data-testid="work-speed-dial" />),
}));

vi.mock('@/src/features/work/EditPublications/EditPublications', () => ({
  default: vi.fn(() => <div data-testid="edit-publications" />),
}));

vi.mock('@/src/features/work/EditReferences/EditReferences', () => ({
  default: vi.fn(() => <div data-testid="edit-references" />),
}));

vi.mock('@/src/features/work/EditWorkSeries/EditWorkSeries', () => ({
  default: vi.fn(() => <div data-testid="edit-work-series" />),
}));

vi.mock('../../EditWorkChapters/EditWorkChapters', () => ({
  EditWorkChapters: vi.fn(() => <div data-testid="edit-work-chapters" />),
}));

vi.mock('../../EditWorkMarketing/EditWorkMarketing', () => ({
  default: vi.fn(() => <div data-testid="edit-work-marketing" />),
}));

vi.mock('../../EditWorkResources/EditWorkResources', () => ({
  default: vi.fn(() => <div data-testid="edit-work-resources" />),
}));

import EditWorkWidget from '../EditWorkWidget';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditWorkWidget', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditWorkWidget workId="test-work-id" /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditWorkWidget');
  });
});
