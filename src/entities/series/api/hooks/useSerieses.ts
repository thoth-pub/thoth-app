import { useQuery } from '@apollo/client/react';

import { usePublisherStateMachine } from '@/src/entities/publisher';
import { appConfig } from '@/src/shared';

import { SeriesDtoMapper } from '../../model/series.mapper';
import { GET_SERIESES } from '../../model/series.schema';

const mapper = new SeriesDtoMapper();

type UseSeriesProps = {
  offset?: number;
  limit?: number;
  filter?: string;
};

const useSerieses = (props: UseSeriesProps) => {
  const { offset = 0, limit = appConfig.data.itemsPerRequestLimit, filter = '' } = props;

  const { activePublisher } = usePublisherStateMachine();

  const publisherId = activePublisher ? [activePublisher] : [];

  const {
    data: { serieses } = { serieses: [] },
    error,
    loading,
    refetch,
    client,
  } = useQuery(GET_SERIESES, {
    variables: { publishers: publisherId, filter, offset, limit },
    skip: publisherId.length === 0,
  });

  const data = serieses.map(mapper.toEntity);

  return { series: data, error, loading, client, refetch };
};

export default useSerieses;
