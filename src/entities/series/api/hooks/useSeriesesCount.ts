import type { PublisherId } from '@/src/entities/publisher';

import { QueryKeys, useServices } from '@/src/shared';
import { useSuspenseQuery } from '@tanstack/react-query';

const useSeriesesCount = (publishersIds: PublisherId[], isAdmin: boolean) => {
  const { seriesService } = useServices();

  const { data: seriesCount = 0, error } = useSuspenseQuery({
    queryKey: [QueryKeys.seriesesCount, ...publishersIds, isAdmin],
    queryFn: () => seriesService.getSeriesCount(publishersIds),
  });

  return { seriesCount, error };
};

export default useSeriesesCount;
