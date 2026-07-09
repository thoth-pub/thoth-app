import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: vi.fn(() => ({ activePublisher: { id: 'pub-1' } })),
}));

vi.mock('@/src/entities/user', () => ({
  useUser: vi.fn(() => ({ userImprintsOptions: [] })),
}));

vi.mock('@/src/entities/series', () => ({
  useAllUserSerieses: vi.fn(() => ({ serieses: [] })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({})),
  useMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useQuery: vi.fn(() => ({ data: null, isLoading: false })),
  QueryClientProvider: vi.fn(({ children }) => children),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
}));

import { UploadModal } from '../components/UploadModal';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('UploadModal', () => {
  it('renders snapshot when open', () => {
    const { container } = render(
      <Wrapper>
        <UploadModal isOpen={true} onClose={vi.fn()} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('UploadModal - open');
  });

  it('renders snapshot when closed', () => {
    const { container } = render(
      <Wrapper>
        <UploadModal isOpen={false} onClose={vi.fn()} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('UploadModal - closed');
  });
});
