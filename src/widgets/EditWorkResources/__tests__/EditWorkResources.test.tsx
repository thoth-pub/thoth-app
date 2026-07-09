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
}));

vi.mock('@/src/entities/work', () => ({
  useWork: vi.fn(() => ({
    work: { id: 'w1', additionalResources: [] },
    loading: false,
    fetching: false,
    refetch: vi.fn(),
  })),
}));

vi.mock('@/src/entities/additional-resource', () => ({
  AdditionalResourcesList: vi.fn(() => <div data-testid="additional-resources-list" />),
  useAdditionalResourceStateMachine: vi.fn(() => ({ activeEntity: null, edit: vi.fn() })),
  useDeleteAdditionalResource: vi.fn(() => ({ deleteAdditionalResource: vi.fn(), loading: false })),
  useMoveAdditionalResource: vi.fn(() => ({ moveAdditionalResource: vi.fn() })),
}));

vi.mock('../../../features/additional-resource/AddAdditionalResource/AddAdditionalResource', () => ({ default: vi.fn(() => null) }));
vi.mock('../../../features/additional-resource/EditAdditionalResource/EditAdditionalResource', () => ({ default: vi.fn(() => null) }));

import EditWorkResources from '../EditWorkResources';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditWorkResources', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditWorkResources workId="test-work-id" /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditWorkResources');
  });
});
