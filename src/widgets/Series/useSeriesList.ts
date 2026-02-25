'use client';

import { useState } from 'react';

import { Direction, SeriesField, SeriesType } from '@/gql/graphql';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { useSerieses, useSeriesesCount } from '@/src/entities/series';
import { appConfig } from '@/src/shared';
import { useDebouncedValue } from '@/src/shared/hooks';

const ITEMS_PER_PAGE = appConfig.data.itemsPerRequestLimit;

export const useSeriesList = () => {
  const { activePublisher } = usePublisherStateMachine();
  const publishersIds = activePublisher && activePublisher.id ? [activePublisher.id] : [];

  const [seriesType, setSeriesType] = useState<SeriesType | 'All'>('All');
  const [activePage, setActivePage] = useState(1);
  const [direction, setDirection] = useState<Direction>(Direction.Asc);
  const [orderBy, setOrderBy] = useState(SeriesField.UpdatedAt);
  const [searchValue, setSearchValue] = useState('');

  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);

  const { seriesCount } = useSeriesesCount(publishersIds);
  const { serieses, loading, isFetched } = useSerieses({
    publishersIds,
    offset: (activePage - 1) * ITEMS_PER_PAGE,
    limit: ITEMS_PER_PAGE,
    direction,
    filter: debouncedValue,
    seriesType: seriesType === 'All' ? undefined : seriesType,
    field: orderBy,
  });

  const totalPagesCount = Math.ceil(seriesCount / ITEMS_PER_PAGE);

  const changePage = (value: number) => {
    setActivePage(value);
  };

  const changeDirection = (value: Direction) => {
    setDirection(value);
  };

  const changeSeriesType = (value: SeriesType | 'All') => {
    setSeriesType(value);
  };

  const changeOrderBy = (value: SeriesField) => {
    setOrderBy(value);
  };
  return {
    // Data
    loading,
    isFetched,
    serieses,

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
    seriesType,
    changeSeriesType,
    orderBy,
    changeOrderBy,
  };
};
