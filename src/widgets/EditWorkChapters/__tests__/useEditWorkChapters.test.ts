import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/entities/work', () => ({
  useWorkChapters: vi.fn(() => ({ chapters: [], isFetching: false, isLoading: false })),
  useCreateWorkChapter: vi.fn(() => ({ createChapter: vi.fn() })),
  useDeleteChapter: vi.fn(() => ({ deleteChapter: vi.fn(), deleteChapters: vi.fn() })),
  useWorkMoveRelation: vi.fn(() => ({ moveWorkRelation: vi.fn() })),
}));

vi.mock('@/src/entities/work/store/hooks/useWorkChaptersStateMachine', () => ({
  useWorkChaptersStateMachine: vi.fn(() => ({ edit: vi.fn(), finishEditing: vi.fn() })),
}));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null, closeForm: vi.fn() })),
}));

import { useEditWorkChapters } from '../useEditWorkChapters';

describe('useEditWorkChapters', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useEditWorkChapters('work-1'));
    expect(result.current.chapters).toEqual([]);
    expect(result.current.selectedChapters).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.controlsDisabled).toBe(false);
  });
});
