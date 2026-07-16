'use client';

import { SeriesField, SeriesType } from '@/gql/graphql';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { useSerieses, useSeriesesCount } from '@/src/entities/series';
import { useFilterSearchParams } from '@/src/shared/hooks';
import { getPagesCount } from '@/src/shared/utils';

export const useSeriesList = () => {
  const { activePublisher } = usePublisherStateMachine();
  const publishersIds = activePublisher?.id ? [activePublisher.id] : [];
  const isPublisherScopedQueryEnabled = publishersIds.length > 0;

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
    extraState,
    changeExtra,
  } = useFilterSearchParams({
    extraParams: {
      seriesType: {
        key: 'seriesType',
        defaultValue: 'All',
        parse: (raw: string) => raw as SeriesType | 'All',
        serialize: (val: string) => val,
      },
    },
  });

  const seriesType = extraState.seriesType as SeriesType | 'All';

  const { seriesCount } = useSeriesesCount({ publishersIds, filter: debouncedValue });

  const { serieses, loading, isFetched } = useSerieses({
    publishersIds,
    offset,
    limit,
    direction,
    filter: debouncedValue,
    seriesType: seriesType === 'All' ? undefined : seriesType,
    field: orderBy as unknown as SeriesField,
  });

  // With no active publisher the query is disabled and never fetches, so isFetched
  // stays false. Treat that as a settled empty state instead of a perpetual load,
  // mirroring useAllWorks, so the list does not spin forever after publisher revocation.
  const settledSerieses = isPublisherScopedQueryEnabled ? serieses : [];
  const settledSeriesCount = isPublisherScopedQueryEnabled ? seriesCount : 0;
  const isSettled = !isPublisherScopedQueryEnabled || isFetched;
  const isLoading = isPublisherScopedQueryEnabled && loading;

  const totalPagesCount = getPagesCount(settledSeriesCount);

  const changeSeriesType = (value: SeriesType | 'All') => {
    changeExtra.seriesType(value);
  };

  return {
    // Data
    loading: isLoading,
    isFetched,
    isSettled,
    serieses: settledSerieses,

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
