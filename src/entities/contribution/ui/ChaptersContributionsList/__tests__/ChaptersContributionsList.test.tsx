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

import ChaptersContributionsList from '../ChaptersContributionsList';

const mockContributions = [
  { id: '1', fullName: 'John Doe', firstName: 'John', lastName: 'Doe', type: 'AUTHOR', biographies: [], affiliations: [], isMain: true },
  { id: '2', fullName: 'Jane Smith', firstName: 'Jane', lastName: 'Smith', type: 'EDITOR', biographies: [], affiliations: [], isMain: false },
];

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('ChaptersContributionsList', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <ChaptersContributionsList
          contributions={mockContributions}
          activeContribution={null}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onDragEnd={vi.fn()}
          form={<div />}
          showRecommendations={false}
        />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('ChaptersContributionsList');
  });

  it('renders with active contribution', () => {
    const { container } = render(
      <Wrapper>
        <ChaptersContributionsList
          contributions={mockContributions}
          activeContribution={mockContributions[0]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onDragEnd={vi.fn()}
          form={<div />}
          showRecommendations={false}
        />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('ChaptersContributionsList - active');
  });
});
