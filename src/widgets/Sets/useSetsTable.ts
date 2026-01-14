'use client';

import { useState } from 'react';

import { Direction, WorkField } from '@/gql/graphql';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import useSets from '@/src/entities/sets/api/hooks/useSets';
import useSetsCount from '@/src/entities/sets/api/hooks/useSetsCount';
import { appConfig } from '@/src/shared';
import { useDebouncedValue } from '@/src/shared/hooks';

const ITEMS_PER_PAGE = appConfig.data.itemsPerRequestLimit;

export const useSetsTable = () => {
  const { activePublisher, isAdmin } = usePublisherStateMachine();
  const publishers = activePublisher ? [activePublisher] : [];

  const [activePage, setActivePage] = useState(1);
  const [direction, setDirection] = useState(Direction.Asc);
  const [orderBy, setOrderBy] = useState(WorkField.UpdatedAtWithRelations);
  const [searchValue, setSearchValue] = useState('');

  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);

  const { setsCount } = useSetsCount(publishers, isAdmin);
  const { sets, loading } = useSets({
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
