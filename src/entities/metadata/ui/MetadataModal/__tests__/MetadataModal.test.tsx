import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

const queryClient = new QueryClient();

vi.mock('@/src/entities/metadata', () => ({
  useMetaData: vi.fn(() => ({
    data: {
      '1': [],
      '2': [],
      '3': [],
      '4': [],
      '5': [],
      '6': [],
      '7': [],
      '8': [],
      '9': [],
    },
  })),
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
}));

import MetadataModal from '../MetadataModal';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></ThemeProvider>;
}

describe('MetadataModal', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <MetadataModal open={true} workId="test-work-id" onClose={vi.fn()} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('MetadataModal');
  });
});
