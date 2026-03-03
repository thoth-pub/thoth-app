import { useQuery } from '@tanstack/react-query';

import { Direction, WorkField } from '@/gql/graphql';
import { PublisherId } from '@/src/entities/publisher';
import { appConfig } from '@/src/shared/config';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

type UseSetsProps = {
  publishersIds: PublisherId[];
  offset?: number;
  limit?: number;
  direction?: Direction;
  filter?: string;
  field?: WorkField;
};

const useSets = (props: UseSetsProps) => {
  const {
    publishersIds,
    offset = 0,
    limit = appConfig.data.itemsPerRequestLimit,
    filter = '',
    field,
    direction,
  } = props;

  const { setService } = useServices();

  const {
    data: sets = [],
    error,
    isLoading,
    isFetched,
  } = useQuery({
    queryKey: [QueryKeys.sets, ...publishersIds, filter, offset, limit, direction, field],
    queryFn: () => setService.getSets({ publishersIds, offset, limit, filter, direction, field }),
    enabled: publishersIds.length > 0,
  });

  return { sets, error, loading: isLoading, isFetched };
};

export default useSets;
