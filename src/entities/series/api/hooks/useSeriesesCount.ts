import { useQuery } from '@tanstack/react-query';

import type { PublisherId } from '@/src/entities/publisher';
import { QueryKeys, useServices } from '@/src/shared';

const useSeriesesCount = (publishersIds: PublisherId[]) => {
  const { seriesService } = useServices();

  const { data: seriesCount = 0, error } = useQuery({
    queryKey: [QueryKeys.seriesesCount, ...publishersIds],
    queryFn: () => seriesService.getSeriesCount(publishersIds),
    enabled: publishersIds.length > 0,
  });

  return { seriesCount, error };
};

export default useSeriesesCount;
