import { useQuery } from '@tanstack/react-query';

import { Direction, SeriesField, SeriesType } from '@/gql/graphql';
import { PublisherId } from '@/src/entities/publisher';
import { appConfig, QueryKeys, useServices } from '@/src/shared';

type UseSeriesProps = {
  publishersIds: PublisherId[];
  offset?: number;
  limit?: number;
  direction?: Direction;
  filter?: string;
  seriesType?: SeriesType;
  field?: SeriesField;
};

const useSerieses = (props: UseSeriesProps) => {
  const {
    publishersIds,
    offset = 0,
    limit = appConfig.data.itemsPerRequestLimit,
    filter = '',
    seriesType,
    field,
    direction,
  } = props;

  const { seriesService } = useServices();

  const {
    data: serieses = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: [QueryKeys.serieses, ...publishersIds, filter, offset, limit, direction, field, seriesType],
    queryFn: () => seriesService.getSerieses({ publishersIds, offset, limit, filter, direction, field, seriesType }),
    enabled: publishersIds.length > 0,
  });

  return { serieses, error, loading: isLoading };
};

export default useSerieses;
