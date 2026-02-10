import { useQuery } from '@tanstack/react-query';

import type { PublisherId } from '@/src/entities/publisher';
import { QueryKeys, useServices } from '@/src/shared';

const useSetsCount = (publishersIds: PublisherId[]) => {
  const { setService } = useServices();

  const { data: setsCount = 0, error } = useQuery({
    queryKey: [QueryKeys.setsCount, ...publishersIds],
    queryFn: () => setService.getSetsCount(publishersIds),
    enabled: publishersIds.length > 0,
  });

  return { setsCount, error };
};

export default useSetsCount;
