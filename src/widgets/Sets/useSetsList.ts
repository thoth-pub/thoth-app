'use client';

import { usePublisherStateMachine } from '@/src/entities/publisher';
import useSets from '@/src/entities/sets/api/hooks/useSets';
import useSetsCount from '@/src/entities/sets/api/hooks/useSetsCount';
import { getPagesCount } from '@/src/shared';
import { useEntityList } from '@/src/shared/hooks';

export const useSetsList = () => {
  const { activePublisher } = usePublisherStateMachine();
  const publishersIds = activePublisher && activePublisher.id ? [activePublisher.id] : [];

  const {
    activePage,
    direction,
    orderBy,
    searchValue,
    debouncedValue,
    offset,
    limit,
    changeSearchValue,
    changePage,
    changeDirection,
    changeOrderBy,
  } = useEntityList({});

  const { setsCount } = useSetsCount({ publishersIds, filter: debouncedValue });

  const totalPagesCount = getPagesCount(setsCount);

  const { sets, loading, isFetched } = useSets({
    publishersIds,
    offset,
    limit,
    direction,
    filter: debouncedValue,
    field: orderBy,
  });

  return {
    // Data
    loading,
    isFetched,
    sets,

    // Search
    searchValue,
    changeSearchValue,

    // Pagination
    activePage,
    totalPagesCount,
    changePage,

    // Filter
    direction,
    changeDirection,
    orderBy,
    changeOrderBy,
  };
};
