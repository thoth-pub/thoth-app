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

import ContributionForms from '../ContributionForms';

const mockContribution = {
  id: '1',
  fullName: 'John Doe',
  firstName: 'John',
  lastName: 'Doe',
  type: 'AUTHOR',
  biographies: [],
  orcidId: null,
  isMain: true,
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('ContributionForms', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <ContributionForms
          showRecommendations={false}
          contribution={mockContribution}
          onNamesSubmit={vi.fn()}
          onContributorTypeSubmit={vi.fn()}
          onBiographySubmit={vi.fn()}
          onIsMainSubmit={vi.fn()}
        />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('ContributionForms');
  });
});
