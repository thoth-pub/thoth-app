import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null })),
}));

vi.mock('@/src/entities/additional-resource', () => ({
  useAdditionalResourceStateMachine: vi.fn(() => ({ activeEntity: null, edit: vi.fn() })),
  useDeleteAdditionalResource: vi.fn(() => ({ deleteAdditionalResource: vi.fn(), loading: false })),
  useMoveAdditionalResource: vi.fn(() => ({ moveAdditionalResource: vi.fn() })),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: vi.fn(() => ({
    work: { id: 'w1', additionalResources: [] },
    loading: false,
    fetching: false,
  })),
}));

import { useEditAdditionalResources } from '../useEditAdditionalResources';

describe('useEditAdditionalResources', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useEditAdditionalResources('work-1'));
    expect(result.current.additionalResources).toEqual([]);
    expect(result.current.activeAdditionalResource).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
