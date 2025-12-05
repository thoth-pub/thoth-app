import { Direction, SeriesField, SeriesType } from '@/gql/graphql';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { appConfig, QueryKeys, useServices } from '@/src/shared';

import { useQuery } from '@tanstack/react-query';

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
  const { seriesService } = useServices();

  const publisherId = activePublisher ? [activePublisher] : [];

  const {
    data: serieses = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: [QueryKeys.serieses, publisherId, filter, offset, limit, direction, field, seriesType],
    queryFn: () =>
      seriesService.getSerieses({ publishersIds: publisherId, offset, limit, filter, direction, field, seriesType }),
  });

  return { serieses, error, loading: isLoading };
};

export default useSerieses;
