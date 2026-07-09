import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/features/work/CreateWorkCopy/CreateWorkCopy', () => ({
  default: vi.fn(() => <div data-testid="create-work-copy" />),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
}));

import CopyWork from '../CopyWork';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('CopyWork', () => {
  it('renders snapshot for translation', () => {
    const { container } = render(
      <Wrapper><CopyWork isTranslation={true} /></Wrapper>
    );
    expect(container).toMatchSnapshot('CopyWork - translation');
  });

  it('renders snapshot for edition', () => {
    const { container } = render(
      <Wrapper><CopyWork isTranslation={false} /></Wrapper>
    );
    expect(container).toMatchSnapshot('CopyWork - edition');
  });
});
