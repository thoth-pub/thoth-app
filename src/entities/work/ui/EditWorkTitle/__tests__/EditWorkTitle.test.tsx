import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

import EditWorkTitle from '../EditWorkTitle';

const queryClient = new QueryClient();

vi.mock('@/src/entities/work', () => ({
  useWork: vi.fn(() => ({
    work: { id: '1', titles: [], edition: 1, imprintId: 'imprint-1' },
    updateWork: vi.fn(),
  })),
}));

vi.mock('@/src/entities/title', () => ({
  useCreateTitle: vi.fn(() => ({ createTitle: vi.fn() })),
  useUpdateTitle: vi.fn(() => ({ updateTitle: vi.fn() })),
  useDeleteTitle: vi.fn(() => ({ deleteTitle: vi.fn() })),
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
  useDefaultLocaleOption: vi.fn(() => ({ value: 'en', label: 'English' })),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></ThemeProvider>;
}

describe('EditWorkTitle', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditWorkTitle workId="test-work-id" /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditWorkTitle');
  });

  it('renders snapshot for chapter', () => {
    const { container } = render(
      <Wrapper><EditWorkTitle workId="test-work-id" isChapter /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditWorkTitle - chapter');
  });

  it('EditWorkTitle_showsMissingTitleRecommendationForUntitledWork', () => {
    const { container } = render(
      <Wrapper><EditWorkTitle workId="test-work-id" recommended /></Wrapper>
    );

    expect(container.querySelector('.animate-ping')).toBeInTheDocument();
  });
});
