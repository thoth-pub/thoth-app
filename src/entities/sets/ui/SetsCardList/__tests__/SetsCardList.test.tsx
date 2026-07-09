import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/entities/sets/store/set.store', () => ({
  useSetStateMachine: vi.fn(() => ({ activeEntity: null, edit: vi.fn() })),
}));

vi.mock('@/src/entities/sets/api/hooks/useDeleteSet', () => ({
  useDeleteSet: vi.fn(() => ({ deleteSet: vi.fn(), loading: false })),
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

import SetsCardList from '../SetsCardList';

const mockSets = [
  { id: '1', titles: [{ id: 't1', title: 'Set A', fullTitle: 'Set A', canonical: true }], updatedAt: '2024-01-01', volumesCount: 0, covers: [] },
  { id: '2', titles: [{ id: 't2', title: 'Set B', fullTitle: 'Set B', canonical: true }], updatedAt: '2024-01-02', volumesCount: 0, covers: [] },
];

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('SetsCardList', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <SetsCardList form={<div />} loading={false} sets={mockSets} page={1} pagesCount={2} onPageChange={vi.fn()} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('SetsCardList');
  });
});
