import { useQuery } from '@apollo/client/react';

import { Direction, SeriesField, SeriesType } from '@/gql/graphql';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { appConfig } from '@/src/shared';

import { SeriesDtoMapper } from '../../model/series.mapper';
import { GET_SERIESES } from '../../model/series.schema';

const mapper = new SeriesDtoMapper();

type UseSeriesProps = {
  offset?: number;
  limit?: number;
  direction?: Direction;
  filter?: string;
  seriesType?: SeriesType;
  field?: SeriesField;
};

const useSerieses = (props: UseSeriesProps) => {
  const { offset = 0, limit = appConfig.data.itemsPerRequestLimit, filter = '', seriesType, field, direction } = props;

  const { activePublisher } = usePublisherStateMachine();

  const publisherId = activePublisher ? [activePublisher] : [];

  const {
    data: { serieses } = { serieses: [] },
    error,
    loading,
    refetch,
    client,
  } = useQuery(GET_SERIESES, {
    variables: {
      publishers: publisherId,
      filter,
      offset,
      limit,
      direction,
      field,
      seriesTypes: seriesType ? [seriesType] : undefined,
    },
    skip: publisherId.length === 0,
  });

  const data = serieses.map(mapper.toEntity);

  return { serieses: data, error, loading, client, refetch };
};

export default useSerieses;
