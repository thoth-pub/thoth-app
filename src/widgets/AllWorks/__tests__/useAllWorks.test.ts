import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  activePublisher: null as { id: string; name: string } | null,
  useWorks: vi.fn(() => ({ works: [], loading: false, isFetched: true })),
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
    mocks.useWorks.mockClear();
    mocks.useWorksCount.mockClear();
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
});
