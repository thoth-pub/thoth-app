import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null })),
}));

vi.mock('@/src/entities/endorsement', () => ({
  useEndorsementStateMachine: vi.fn(() => ({ activeEntity: null, edit: vi.fn() })),
  useDeleteEndorsement: vi.fn(() => ({ deleteEndorsement: vi.fn(), loading: false })),
  useMoveEndorsement: vi.fn(() => ({ moveEndorsement: vi.fn() })),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: vi.fn(() => ({
    work: { id: 'w1', endorsements: [] },
    loading: false,
    fetching: false,
  })),
}));

import { useEditEndorsements } from '../useEditEndorsements';

describe('useEditEndorsements', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useEditEndorsements('work-1'));
    expect(result.current.endorsements).toEqual([]);
    expect(result.current.activeEndorsement).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
