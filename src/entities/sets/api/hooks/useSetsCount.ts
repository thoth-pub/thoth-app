import { useSuspenseQuery } from '@tanstack/react-query';

import type { PublisherId } from '@/src/entities/publisher';
import { QueryKeys, useServices } from '@/src/shared';

const useSetsCount = (publishersIds: PublisherId[], isAdmin: boolean) => {
  const { setsService } = useServices();

  const { data: setsCount = 0, error } = useSuspenseQuery({
    queryKey: [QueryKeys.setsCount, ...publishersIds, isAdmin],
    queryFn: () => setsService.getSetsCount(publishersIds),
  });

  return { setsCount, error };
};

export default useSetsCount;
