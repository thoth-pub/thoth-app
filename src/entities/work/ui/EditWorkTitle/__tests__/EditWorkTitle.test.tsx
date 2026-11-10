import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

import EditWorkTitle from '../EditWorkTitle';

const queryClient = new QueryClient();

const mocks = vi.hoisted(() => ({
  edit: vi.fn(),
  // The imprint's default locale; undefined while identity has not settled.
  defaultLocaleOption: { value: 'en', label: 'English' } as { value: string; label: string } | undefined,
}));

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
  default: vi.fn(() => ({ activeFormId: null, edit: mocks.edit, closeForm: vi.fn() })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => true),
  useDefaultLocaleOption: vi.fn(() => mocks.defaultLocaleOption),
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

  describe('identity gate (APP-AUTH-IDENTITY-FORMS-01)', () => {
    beforeEach(() => {
      mocks.edit.mockClear();
      mocks.defaultLocaleOption = { value: 'en', label: 'English' };
    });

    it('cannot be opened while identity is loading or expired, so no default locale is applied', () => {
      mocks.defaultLocaleOption = undefined;
      const { container } = render(
        <Wrapper><EditWorkTitle workId="test-work-id" /></Wrapper>
      );

      expect(container.querySelector('button')).toBeDisabled();
      fireEvent.doubleClick(container.firstElementChild as Element);
      expect(mocks.edit).not.toHaveBeenCalled();
    });

    it('can be opened with authoritative identity', () => {
      const { container } = render(
        <Wrapper><EditWorkTitle workId="test-work-id" /></Wrapper>
      );

      expect(container.querySelector('button')).toBeEnabled();
      fireEvent.doubleClick(container.firstElementChild as Element);
      expect(mocks.edit).toHaveBeenCalled();
    });
  });
});
