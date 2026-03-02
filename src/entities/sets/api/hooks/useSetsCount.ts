import { useQuery } from '@tanstack/react-query';

import type { PublisherId } from '@/src/entities/publisher';
import { QueryKeys, useServices } from '@/src/shared';

type UseSetsCountProps = {
  publishersIds: PublisherId[];
  filter?: string;
};

const useSetsCount = (props: UseSetsCountProps) => {
  const { publishersIds, filter } = props;

  const { setService } = useServices();

  const { data: setsCount = 0, error } = useQuery({
    queryKey: [QueryKeys.setsCount, ...publishersIds, filter],
    queryFn: () => setService.getSetsCount({ publishersIds, filter }),
    enabled: publishersIds.length > 0,
  });

  return { setsCount, error };
};

export default useSetsCount;
