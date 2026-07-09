import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/hooks', () => ({
  useFilterSearchParams: vi.fn(() => ({
    activePage: 1,
    direction: 'ASC',
    orderBy: 'TITLE',
    searchValue: '',
    debouncedValue: '',
    offset: 0,
    limit: 20,
    changeSearchValue: vi.fn(),
    changePage: vi.fn(),
    changeDirection: vi.fn(),
    changeOrderBy: vi.fn(),
  })),
}));

vi.mock('@/src/entities/publisher', () => ({
  usePublisherStateMachine: vi.fn(() => ({ activePublisher: { id: 'pub-1' } })),
}));

vi.mock('@/src/entities/sets/api/hooks/useSets', () => ({
  default: vi.fn(() => ({ sets: [], loading: false, isFetched: true })),
}));

vi.mock('@/src/entities/sets/api/hooks/useSetsCount', () => ({
  default: vi.fn(() => ({ setsCount: 0 })),
}));

import { useSetsList } from '../useSetsList';

describe('useSetsList', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useSetsList());
    expect(result.current.sets).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.isFetched).toBe(true);
    expect(result.current.activePage).toBe(1);
  });
});
