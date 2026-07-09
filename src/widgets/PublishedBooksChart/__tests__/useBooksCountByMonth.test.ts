import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/entities/book', () => ({
  useBooksCount: vi.fn(() => ({ bookCount: 5, isFetched: true })),
}));

vi.mock('@/src/entities/publisher', () => ({
  usePublisherStateMachine: vi.fn(() => ({ activePublisher: { id: 'pub-1' } })),
}));

import { useBooksCountByMonth } from '../useBooksCountByMonth';

describe('useBooksCountByMonth', () => {
  it('returns book count and isFetched', () => {
    const { result } = renderHook(() =>
      useBooksCountByMonth({ date: '2024-01-01', workStatuses: ['ACTIVE'] as any })
    );
    expect(result.current.bookCount).toBe(5);
    expect(result.current.isFetched).toBe(true);
  });
});
