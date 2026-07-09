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

import EditFeaturedVideoForm from '../EditFeaturedVideoForm';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditFeaturedVideoForm', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <EditFeaturedVideoForm />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('EditFeaturedVideoForm');
  });

  it('renders with all values', () => {
    const { container } = render(
      <Wrapper>
        <EditFeaturedVideoForm
          title="Promo Video"
          url="https://youtube.com/watch?v=test"
          width={1920}
          height={1080}
          fileUrl="https://example.com/video.mp4"
          onTitleUpdate={vi.fn()}
          onUrlUpdate={vi.fn()}
          onWidthUpdate={vi.fn()}
          onHeightUpdate={vi.fn()}
        />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('EditFeaturedVideoForm - filled');
  });
});
