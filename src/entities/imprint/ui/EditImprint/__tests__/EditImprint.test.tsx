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

import EditImprint from '../EditImprint';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditImprint (imprint entity)', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditImprint /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditImprint - imprint entity');
  });

  it('renders with imprint data', () => {
    const { container } = render(
      <Wrapper>
        <EditImprint
          imprint={{ id: '1', name: 'Academic Press', url: 'https://academicpress.com', defaultPlace: 'New York', defaultCurrency: 'USD', defaultLocale: 'en' } as any}
          id="1"
        />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('EditImprint - imprint entity with data');
  });

  it('calls onUpdate on submit', () => {
    const onUpdate = vi.fn();
    const { container } = render(
      <Wrapper>
        <EditImprint
          imprint={{ id: '1', name: 'Academic Press' } as any}
          id="1"
          onUpdate={onUpdate}
        />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('EditImprint - imprint entity with onUpdate');
  });
});
