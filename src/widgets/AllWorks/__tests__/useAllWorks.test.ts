import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  activePublisher: null as { id: string; name: string } | null,
  useWorks: vi.fn(() => ({ works: [] as { id: string }[], loading: false, isFetched: true })),
  useWorksCount: vi.fn(() => ({ workCount: 0 })),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: () => ({ activePublisher: mocks.activePublisher }),
}));

vi.mock('@/src/entities/work', () => ({
  useWorks: mocks.useWorks,
  useWorksCount: mocks.useWorksCount,
  useCreateNewWorkEdition: () => ({ createNewWorkEdition: vi.fn() }),
  useCreateWorkTranslation: () => ({ createWorkTranslation: vi.fn() }),
}));

vi.mock('@/src/shared/hooks', () => ({
  useFilterSearchParams: () => ({
    activePage: 1,
    direction: 'ASC',
    orderBy: 'UPDATED_AT_WITH_RELATIONS',
    searchValue: '',
    debouncedValue: '',
    offset: 0,
    limit: 20,
    changeSearchValue: vi.fn(),
    changePage: vi.fn(),
    changeDirection: vi.fn(),
    changeOrderBy: vi.fn(),
    extraState: { workStatus: 'All', workType: 'All' },
    changeExtra: { workStatus: vi.fn(), workType: vi.fn() },
  }),
}));

import { useAllWorks } from '../useAllWorks';

describe('useAllWorks', () => {
  beforeEach(() => {
    mocks.activePublisher = null;
    mocks.useWorks.mockReset().mockReturnValue({ works: [], loading: false, isFetched: true });
    mocks.useWorksCount.mockReset().mockReturnValue({ workCount: 0 });
  });

  it('useAllWorks_noActivePublisherReturnsSettledEmptyState', () => {
    mocks.useWorks.mockReturnValue({ works: [{ id: 'stale-work' }], loading: true, isFetched: false });
    mocks.useWorksCount.mockReturnValue({ workCount: 25 });

    const { result } = renderHook(() => useAllWorks());

    expect(result.current).toMatchObject({
      works: [],
      workCount: 0,
      loading: false,
      isFetched: false,
      isSettled: true,
      totalPagesCount: 0,
    });
    expect(mocks.useWorks).toHaveBeenCalledWith(expect.objectContaining({ publishersIds: [] }));
    expect(mocks.useWorksCount).toHaveBeenCalledWith(expect.objectContaining({ publishersIds: [] }));
  });

  it('useAllWorks_doesNotQueryWithEmptyPublisherIdWhenNoActivePublisher', () => {
    renderHook(() => useAllWorks());

    expect(mocks.useWorks).toHaveBeenCalledWith(
      expect.objectContaining({ publishersIds: [] }),
    );
    expect(mocks.useWorksCount).toHaveBeenCalledWith(
      expect.objectContaining({ publishersIds: [] }),
    );
    expect(mocks.useWorks).not.toHaveBeenCalledWith(
      expect.objectContaining({ publishersIds: [''] }),
    );
    expect(mocks.useWorksCount).not.toHaveBeenCalledWith(
      expect.objectContaining({ publishersIds: [''] }),
    );
  });

  it('useAllWorks_queriesWithActivePublisherIdWhenAvailable', () => {
    const publisherId = '550e8400-e29b-41d4-a716-446655440000';
    mocks.activePublisher = { id: publisherId, name: 'Publisher A' };

    renderHook(() => useAllWorks());

    expect(mocks.useWorks).toHaveBeenCalledWith(
      expect.objectContaining({ publishersIds: [publisherId] }),
    );
    expect(mocks.useWorksCount).toHaveBeenCalledWith(
      expect.objectContaining({ publishersIds: [publisherId] }),
    );
  });

  it('useAllWorks_activePublisherKeepsExistingLoadingBehaviour', () => {
    mocks.activePublisher = { id: 'publisher-1', name: 'Publisher A' };
    mocks.useWorks.mockReturnValue({ works: [], loading: true, isFetched: false });

    const { result, rerender } = renderHook(() => useAllWorks());

    expect(result.current).toMatchObject({
      works: [],
      workCount: 0,
      loading: true,
      isFetched: false,
      isSettled: false,
    });

    mocks.useWorks.mockReturnValue({ works: [{ id: 'work-1' }], loading: false, isFetched: true });
    rerender();

    expect(result.current).toMatchObject({
      works: [{ id: 'work-1' }],
      loading: false,
      isFetched: true,
      isSettled: true,
    });
  });
});
