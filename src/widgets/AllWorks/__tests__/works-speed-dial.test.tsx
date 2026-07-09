import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: vi.fn(({ children, ...props }) => <a {...props}>{children}</a>),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
}));

import { WorksSpeedDial } from '../components/WorksSpeedDial';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('WorksSpeedDial', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <WorksSpeedDial onUpload={vi.fn()} onCreateTranslation={vi.fn()} onCreateNewEdition={vi.fn()} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('WorksSpeedDial');
  });
});
