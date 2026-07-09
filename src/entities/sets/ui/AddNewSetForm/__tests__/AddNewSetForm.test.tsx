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
  useDefaultLocaleOption: vi.fn(() => ({ value: 'en', label: 'English' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => true),
}));

import { AddNewSetForm } from '../AddNewSetForm';

const mockSet = {
  id: '1',
  setName: 'Test Set',
  imprintId: 'imprint-1',
  titles: [],
  setType: 'BOX_SET',
};

const imprintOptions = [{ value: 'imprint-1', label: 'Test Imprint' }];

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('AddNewSetForm', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <AddNewSetForm
          set={mockSet}
          imprintOptions={imprintOptions}
          onUpdateImprint={vi.fn()}
          onUpdateTitles={vi.fn()}
          onDeleteTitle={vi.fn()}
        />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('AddNewSetForm');
  });
});
