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

import EditPublication from '../EditPublication';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditPublication', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <EditPublication
          publicationType="PAPERBACK"
          isbn="978-1-234-56789-0"
          width={6}
          widthIn={6}
          height={9}
          heightIn={9}
          depth={0.5}
          depthIn={0.5}
          weight={12}
          weightOz={12}
          fileUrl=""
          loading={false}
          accessibilityStandards={[]}
          accessibilityException={null}
          accessibilityReportUrl=""
          isDimensionFormHidden={false}
          isUploadFileFormDisabled={false}
        />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('EditPublication');
  });
});
