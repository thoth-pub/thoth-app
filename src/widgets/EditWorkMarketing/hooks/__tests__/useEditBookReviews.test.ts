import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null })),
}));

vi.mock('@/src/entities/book-review', () => ({
  useBookReviewStateMachine: vi.fn(() => ({ activeEntity: null, edit: vi.fn() })),
  useDeleteBookReview: vi.fn(() => ({ deleteBookReview: vi.fn(), loading: false })),
  useMoveBookReview: vi.fn(() => ({ moveBookReview: vi.fn() })),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: vi.fn(() => ({
    work: { id: 'w1', bookReviews: [] },
    loading: false,
    fetching: false,
  })),
}));

import { useEditBookReviews } from '../useEditBookReviews';

describe('useEditBookReviews', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useEditBookReviews('work-1'));
    expect(result.current.bookReviews).toEqual([]);
    expect(result.current.activeBookReview).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
