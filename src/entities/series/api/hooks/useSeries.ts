import { useQuery } from '@apollo/client/react';

import type { PublisherId } from '@/src/entities/publisher';

import { SeriesDtoMapper } from '../../model/series.mapper';
import { GET_SERIES } from '../../model/series.schema';

const mapper = new SeriesDtoMapper();

const useSeries = (publishersIds: PublisherId[], filter: string) => {
  const {
    data: { serieses } = { serieses: [] },
    error,
    loading,
    refetch,
    client,
  } = useQuery(GET_SERIES, {
    variables: { publishers: publishersIds, filter },
    skip: publishersIds.length === 0 || filter.length === 0,
  });

  const data = serieses.map(mapper.toEntity);

  return { series: data, error, loading, refetch, client };
};

export default useSeries;
