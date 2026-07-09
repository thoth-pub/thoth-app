import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/entities/locations/store/location.store', () => ({
  useLocationStateMachine: vi.fn(() => ({ activeEntity: null, edit: vi.fn(), finishEditing: vi.fn() })),
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

import EditLocations from '../EditLocations';

const mockLocations = [
  { id: '1', locationPlatform: 'PROJECT_MUSE', fullTextUrl: '', landingPage: 'https://muse.jhu.edu', canonical: true },
];

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditLocations', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <EditLocations locations={mockLocations} isFullTextUrlHidden={false} onUpdate={vi.fn()} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('EditLocations');
  });

  it('renders empty state', () => {
    const { container } = render(
      <Wrapper>
        <EditLocations locations={[]} isFullTextUrlHidden={false} onUpdate={vi.fn()} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('EditLocations - empty');
  });
});
