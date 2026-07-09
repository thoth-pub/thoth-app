import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null, edit: vi.fn(), closeForm: vi.fn() })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => true),
}));

vi.mock('../useContributionsList', () => ({
  useContributionsList: vi.fn(() => ({
    contributions: [
      {
        id: '1',
        fullName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        type: 'AUTHOR',
        biographies: [],
        affiliations: [],
        isMain: true,
        orcidId: null,
      },
    ],
    activeContribution: null,
    loading: false,
    fetching: false,
    editDisabled: false,
    deleteLoading: false,
    dragEnd: vi.fn(),
    editContribution: vi.fn(),
    deleteContribution: vi.fn(),
  })),
}));

import WorkContributionsList from '../WorkContributionsList';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('WorkContributionsList', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <WorkContributionsList workId="test-work-id" form={<div />} showRecommendations={false} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('WorkContributionsList');
  });
});
