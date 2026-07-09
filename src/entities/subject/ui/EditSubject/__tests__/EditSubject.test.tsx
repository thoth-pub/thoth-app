import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

const queryClient = new QueryClient();

vi.mock('@/src/entities/subject', () => ({
  useUpdateSubject: vi.fn(() => ({ updateSubject: vi.fn() })),
}));

vi.mock('@/src/entities/subject/store/subject.store', () => ({
  useSubjectStateMachine: vi.fn(() => ({
    activeEntity: { id: '1', code: 'BIO000000', type: 'BIC' },
    finishEditing: vi.fn(),
  })),
}));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ closeForm: vi.fn() })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => true),
}));

import { EditSubject } from '../EditSubject';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></ThemeProvider>;
}

describe('EditSubject', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditSubject workId="test-work-id" /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditSubject');
  });
});
