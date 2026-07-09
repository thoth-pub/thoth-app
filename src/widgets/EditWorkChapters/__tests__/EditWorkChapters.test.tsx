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
}));

vi.mock('@/src/entities/work', () => ({
  useWorkChapters: vi.fn(() => ({ chapters: [], isFetching: false, isLoading: false })),
  useCreateWorkChapter: vi.fn(() => ({ createChapter: vi.fn() })),
  useDeleteChapter: vi.fn(() => ({ deleteChapter: vi.fn(), deleteChapters: vi.fn() })),
  useWorkMoveRelation: vi.fn(() => ({ moveWorkRelation: vi.fn() })),
}));

vi.mock('@/src/entities/work/store/hooks/useWorkChaptersStateMachine', () => ({
  useWorkChaptersStateMachine: vi.fn(() => ({ edit: vi.fn(), finishEditing: vi.fn() })),
}));

vi.mock('@/src/features', () => ({
  EditChapterModal: vi.fn(() => <div data-testid="edit-chapter-modal" />),
  EditChaptersModal: vi.fn(() => <div data-testid="edit-chapters-modal" />),
}));

vi.mock('@/src/features/work/AddChapterModal/AddChapterModal', () => ({
  default: vi.fn(() => <div data-testid="add-chapter-modal" />),
}));

import { EditWorkChapters } from '../EditWorkChapters';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditWorkChapters', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditWorkChapters workId="test-work-id" /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditWorkChapters');
  });
});
