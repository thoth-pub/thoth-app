import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/entities/work', () => ({
  useWork: vi.fn(() => ({
    work: { imprintId: 'imprint-1', imprintName: 'Test Imprint', place: 'London' },
    updateWork: vi.fn(),
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

import { EditImprint } from '../EditImprint';

const imprintOptions = [{ value: 'imprint-1', label: 'Test Imprint' }];

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditImprint', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditImprint workId="test-work-id" imprintOptions={imprintOptions} /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditImprint');
  });

  it('renders snapshot with recommended', () => {
    const { container } = render(
      <Wrapper><EditImprint workId="test-work-id" imprintOptions={imprintOptions} recommended /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditImprint - recommended');
  });
});
