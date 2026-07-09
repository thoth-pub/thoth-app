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
    extraState: { seriesType: 'All' },
    changeExtra: { seriesType: vi.fn() },
  })),
}));

vi.mock('@/src/entities/publisher', () => ({
  usePublisherStateMachine: vi.fn(() => ({ activePublisher: { id: 'pub-1' } })),
}));

vi.mock('@/src/entities/series', () => ({
  useSerieses: vi.fn(() => ({ serieses: [], loading: false, isFetched: true })),
  useSeriesesCount: vi.fn(() => ({ seriesCount: 0 })),
}));

import { useSeriesList } from '../useSeriesList';

describe('useSeriesList', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useSeriesList());
    expect(result.current.serieses).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.isFetched).toBe(true);
    expect(result.current.activePage).toBe(1);
  });
});
