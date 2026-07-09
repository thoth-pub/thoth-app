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

import EditSeriesForm from '../EditSeriesForm';

const imprintOptions = [{ value: 'imprint-1', label: 'Test Imprint' }];

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditSeriesForm', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <EditSeriesForm
          imprintOptions={imprintOptions}
          onTypeChange={vi.fn()}
          onUrlChange={vi.fn()}
          onCfpUrlChange={vi.fn()}
          onNameChange={vi.fn()}
          onIssnChange={vi.fn()}
          onImprintChange={vi.fn()}
          onDescriptionChange={vi.fn()}
        />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('EditSeriesForm');
  });

  it('renders with all values filled', () => {
    const { container } = render(
      <Wrapper>
        <EditSeriesForm
          imprintOptions={imprintOptions}
          type="BOOK_SERIES"
          name="Test Series"
          issnPrint="1234-5678"
          issnDigital="8765-4321"
          url="https://example.com"
          cfpUrl="https://example.com/cfp"
          imprint="imprint-1"
          description="A test series description"
          onTypeChange={vi.fn()}
          onUrlChange={vi.fn()}
          onCfpUrlChange={vi.fn()}
          onNameChange={vi.fn()}
          onIssnChange={vi.fn()}
          onImprintChange={vi.fn()}
          onDescriptionChange={vi.fn()}
        />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('EditSeriesForm - filled');
  });
});
