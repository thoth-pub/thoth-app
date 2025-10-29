import { useQuery } from '@apollo/client/react';

import { SeriesDtoMapper } from '../../model/series.mapper';
import { GET_SERIES } from '../../model/series.schema';
import type { SeriesId } from '../../model/series.types';

const mapper = new SeriesDtoMapper();

type UseSeriesProps = {
  seriesId: SeriesId;
};

const useSeries = (props: UseSeriesProps) => {
  const { seriesId } = props;

  const {
    data: { series } = { series: null },
    error,
    loading,
    refetch,
    client,
  } = useQuery(GET_SERIES, {
    variables: { seriesId },
    skip: seriesId.length === 0,
  });

  const data = series ? mapper.toEntity(series) : null;

  return { series: data, error, loading, client, refetch };
};

export default useSeries;
