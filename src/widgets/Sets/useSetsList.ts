'use client';

import { useState } from 'react';

import { Direction, WorkField } from '@/gql/graphql';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import useSets from '@/src/entities/sets/api/hooks/useSets';
import useSetsCount from '@/src/entities/sets/api/hooks/useSetsCount';
import { appConfig } from '@/src/shared';
import { useDebouncedValue } from '@/src/shared/hooks';

const ITEMS_PER_PAGE = appConfig.data.itemsPerRequestLimit;

export const useSetsList = () => {
  const { activePublisher } = usePublisherStateMachine();
  const publishersIds = activePublisher && activePublisher.id ? [activePublisher.id] : [];

  const [activePage, setActivePage] = useState(1);
  const [direction, setDirection] = useState(Direction.Asc);
  const [orderBy, setOrderBy] = useState(WorkField.UpdatedAt);
  const [searchValue, setSearchValue] = useState('');

  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);

  const { setsCount } = useSetsCount(publishersIds);
  const { sets, loading, isFetched } = useSets({
    publishersIds,
    offset: (activePage - 1) * ITEMS_PER_PAGE,
    limit: ITEMS_PER_PAGE,
    direction,
    filter: debouncedValue,
    field: orderBy,
  });

  const totalPagesCount = Math.ceil(setsCount / ITEMS_PER_PAGE);

  const changePage = (value: number) => {
    setActivePage(value);
  };

  const changeDirection = (value: Direction) => {
    setDirection(value);
  };

  const changeOrderBy = (value: WorkField) => {
    setOrderBy(value);
  };

  return {
    // Data
    loading,
    isFetched,
    sets,

    // Search
    searchValue,
    setSearchValue,

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
