'use client';

import { useState } from 'react';

import { SeriesField, SeriesType } from '@/gql/graphql';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { useSerieses, useSeriesesCount } from '@/src/entities/series';
import { useEntityList } from '@/src/shared/hooks';
import { getPagesCount } from '@/src/shared/utils';

export const useSeriesList = () => {
  const { activePublisher } = usePublisherStateMachine();
  const publishersIds = activePublisher && activePublisher.id ? [activePublisher.id] : [];

  const [seriesType, setSeriesType] = useState<SeriesType | 'All'>('All');

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

  const { seriesCount } = useSeriesesCount({ publishersIds, filter: debouncedValue });

  const totalPagesCount = getPagesCount(seriesCount);

  const { serieses, loading, isFetched } = useSerieses({
    publishersIds,
    offset,
    limit,
    direction,
    filter: debouncedValue,
    seriesType: seriesType === 'All' ? undefined : seriesType,
    field: orderBy as unknown as SeriesField,
  });

  const changeSeriesType = (value: SeriesType | 'All') => {
    setSeriesType(value);
  };

  return {
    // Data
    loading,
    isFetched,
    serieses,

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
    seriesType,
    changeSeriesType,
    orderBy,
    changeOrderBy,
  };
};
