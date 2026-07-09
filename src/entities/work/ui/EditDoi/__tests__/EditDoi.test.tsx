import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/entities/work', () => ({
  useWork: vi.fn(() => ({ work: { doi: '10.1234/test', landingPage: 'https://example.com' }, updateWork: vi.fn() })),
  useWorkRecommendations: vi.fn(() => ({ isDoiRequired: false, isLandingPageRequired: false })),
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

import EditDoi from '../EditDoi';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditDoi', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditDoi workId="test-work-id" /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditDoi');
  });

  it('renders snapshot with recommended', () => {
    const { container } = render(
      <Wrapper><EditDoi workId="test-work-id" recommended /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditDoi - recommended');
  });

  it('renders snapshot for chapter', () => {
    const { container } = render(
      <Wrapper><EditDoi workId="test-work-id" isChapter /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditDoi - chapter');
  });
});
