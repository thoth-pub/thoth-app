import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null })),
}));

vi.mock('@/src/entities/featured-video', () => ({
  useFeaturedVideoStateMachine: vi.fn(() => ({ activeEntity: null, edit: vi.fn() })),
  useDeleteFeaturedVideo: vi.fn(() => ({ deleteFeaturedVideo: vi.fn(), loading: false })),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: vi.fn(() => ({
    work: { id: 'w1', featuredVideo: null },
    loading: false,
    fetching: false,
  })),
}));

import { useEditFeaturedVideo } from '../useEditFeaturedVideo';

describe('useEditFeaturedVideo', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useEditFeaturedVideo('work-1'));
    expect(result.current.featuredVideo).toBeNull();
    expect(result.current.activeFeaturedVideo).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
