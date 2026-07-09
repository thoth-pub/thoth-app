import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

const queryClient = new QueryClient();

vi.mock('@/src/entities/institution', () => ({
  useInstitutions: vi.fn(() => ({ institutions: [{ id: 'inst-1', name: 'University of Test' }], loading: false })),
}));

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
  useDebouncedValue: vi.fn((value) => value),
}));

import EditInstitutionForm from '../EditInstitutionForm';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></ThemeProvider>;
}

describe('EditInstitutionForm', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <EditInstitutionForm defaultValue={{ value: 'inst-1', label: 'University of Test' }} onUpdate={vi.fn()} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('EditInstitutionForm');
  });
});
