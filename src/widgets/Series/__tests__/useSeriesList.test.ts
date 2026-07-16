import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  activePublisher: null as { id: string } | null,
  useSerieses: vi.fn(() => ({ serieses: [] as { id: string }[], loading: false, isFetched: true })),
  useSeriesesCount: vi.fn(() => ({ seriesCount: 0 })),
}));

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
  usePublisherStateMachine: vi.fn(() => ({ activePublisher: mocks.activePublisher })),
}));

vi.mock('@/src/entities/series', () => ({
  useSerieses: mocks.useSerieses,
  useSeriesesCount: mocks.useSeriesesCount,
}));

import { useSeriesList } from '../useSeriesList';

describe('useSeriesList', () => {
  beforeEach(() => {
    mocks.activePublisher = { id: 'pub-1' };
    mocks.useSerieses.mockReset().mockReturnValue({ serieses: [], loading: false, isFetched: true });
    mocks.useSeriesesCount.mockReset().mockReturnValue({ seriesCount: 0 });
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useSeriesList());
    expect(result.current.serieses).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.isFetched).toBe(true);
    expect(result.current.activePage).toBe(1);
  });

  it('useSeriesList_noActivePublisherReturnsSettledEmptyState', () => {
    mocks.activePublisher = null;
    // The disabled query never fetches (isFetched false) and may still hold stale data.
    mocks.useSerieses.mockReturnValue({ serieses: [{ id: 'stale-series' }], loading: true, isFetched: false });
    mocks.useSeriesesCount.mockReturnValue({ seriesCount: 25 });

    const { result } = renderHook(() => useSeriesList());

    expect(result.current).toMatchObject({
      serieses: [],
      loading: false,
      isFetched: false,
      isSettled: true,
      totalPagesCount: 0,
    });
  });

  it('useSeriesList_doesNotQueryWithEmptyPublisherIdWhenNoActivePublisher', () => {
    mocks.activePublisher = null;

    renderHook(() => useSeriesList());

    expect(mocks.useSerieses).toHaveBeenCalledWith(expect.objectContaining({ publishersIds: [] }));
    expect(mocks.useSeriesesCount).toHaveBeenCalledWith(expect.objectContaining({ publishersIds: [] }));
    expect(mocks.useSerieses).not.toHaveBeenCalledWith(expect.objectContaining({ publishersIds: [''] }));
    expect(mocks.useSeriesesCount).not.toHaveBeenCalledWith(expect.objectContaining({ publishersIds: [''] }));
  });

  it('useSeriesList_activePublisherKeepsExistingLoadingBehaviour', () => {
    mocks.activePublisher = { id: 'pub-1' };
    mocks.useSerieses.mockReturnValue({ serieses: [], loading: true, isFetched: false });

    const { result, rerender } = renderHook(() => useSeriesList());

    expect(result.current).toMatchObject({
      serieses: [],
      loading: true,
      isFetched: false,
      isSettled: false,
    });

    mocks.useSerieses.mockReturnValue({ serieses: [{ id: 'series-1' }], loading: false, isFetched: true });
    rerender();

    expect(result.current).toMatchObject({
      serieses: [{ id: 'series-1' }],
      loading: false,
      isFetched: true,
      isSettled: true,
    });
  });
});
