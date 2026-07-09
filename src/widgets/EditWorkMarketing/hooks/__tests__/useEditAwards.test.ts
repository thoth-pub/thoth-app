import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null })),
}));

vi.mock('@/src/entities/award', () => ({
  useAwardStateMachine: vi.fn(() => ({ activeEntity: null, edit: vi.fn() })),
  useDeleteAward: vi.fn(() => ({ deleteAward: vi.fn(), loading: false })),
  useMoveAward: vi.fn(() => ({ moveAward: vi.fn() })),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: vi.fn(() => ({
    work: { id: 'w1', awards: [] },
    loading: false,
    fetching: false,
  })),
}));

import { useEditAwards } from '../useEditAwards';

describe('useEditAwards', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useEditAwards('work-1'));
    expect(result.current.awards).toEqual([]);
    expect(result.current.activeAward).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.fetching).toBe(false);
  });
});
