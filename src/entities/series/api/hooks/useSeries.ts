import { useQuery } from '@apollo/client/react';

import type { PublisherId } from '@/src/entities/publisher';
import { appConfig } from '@/src/shared';

import { SeriesDtoMapper } from '../../model/series.mapper';
import { GET_SERIES } from '../../model/series.schema';

const mapper = new SeriesDtoMapper();

type UseSeriesProps = {
  publishersIds: PublisherId[];
  offset?: number;
  limit?: number;
  filter?: string;
};

const useSeries = (props: UseSeriesProps) => {
  const { publishersIds, offset = 0, limit = appConfig.data.itemsPerRequestLimit, filter = '' } = props;

  const {
    data: { serieses } = { serieses: [] },
    error,
    loading,
    refetch,
    client,
  } = useQuery(GET_SERIES, {
    variables: { publishers: publishersIds, filter, offset, limit },
    skip: publishersIds.length === 0,
  });

  const data = serieses.map(mapper.toEntity);

  return { series: data, error, loading, refetch, client };
};

export default useSeries;
