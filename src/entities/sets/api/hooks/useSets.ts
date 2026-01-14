import { useQuery } from '@tanstack/react-query';

import { Direction, WorkField } from '@/gql/graphql';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { appConfig, QueryKeys, useServices } from '@/src/shared';

type UseSeriesProps = {
  offset?: number;
  limit?: number;
  direction?: Direction;
  filter?: string;
  field?: WorkField;
};

const useSets = (props: UseSeriesProps) => {
  const { offset = 0, limit = appConfig.data.itemsPerRequestLimit, filter = '', field, direction } = props;

  const { activePublisher } = usePublisherStateMachine();
  const { setsService } = useServices();

  const publisherId = activePublisher ? [activePublisher] : [];

  const {
    data: sets = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: [QueryKeys.sets, publisherId, filter, offset, limit, direction, field],
    queryFn: () => setsService.getSets({ publishersIds: publisherId, offset, limit, filter, direction, field }),
  });

  return { sets, error, loading: isLoading };
};

export default useSets;
