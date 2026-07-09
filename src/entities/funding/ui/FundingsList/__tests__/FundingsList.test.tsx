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

vi.mock('@/src/entities/funding', () => ({}));

import FundingsList from '../FundingsList';

const mockFundings = [
  { id: '1', projectName: 'Project A', grantNumber: 'GR-001', program: 'Program X', institutionName: 'Uni A', institutionRor: null },
  { id: '2', projectName: 'Project B', grantNumber: 'GR-002', program: 'Program Y', institutionName: 'Uni B', institutionRor: null },
];

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('FundingsList', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <FundingsList activeFunding={null} fundings={mockFundings} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('FundingsList');
  });

  it('renders empty state', () => {
    const { container } = render(
      <Wrapper>
        <FundingsList activeFunding={null} fundings={[]} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('FundingsList - empty');
  });

  it('renders with onDelete and onEdit callbacks', () => {
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    const { container } = render(
      <Wrapper>
        <FundingsList activeFunding={null} fundings={mockFundings} onDelete={onDelete} onEdit={onEdit} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('FundingsList - with callbacks');
  });
});
