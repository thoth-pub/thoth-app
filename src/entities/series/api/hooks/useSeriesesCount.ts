import { useQuery } from '@tanstack/react-query';

import type { PublisherId } from '@/src/entities/publisher';
import { QueryKeys, useServices } from '@/src/shared';

type UseSeriesesCountProps = {
  publishersIds: PublisherId[];
  filter?: string;
};

const useSeriesesCount = (props: UseSeriesesCountProps) => {
  const { publishersIds, filter } = props;

  const { seriesService } = useServices();

  const { data: seriesCount = 0, error } = useQuery({
    queryKey: [QueryKeys.seriesesCount, ...publishersIds, filter],
    queryFn: () => seriesService.getSeriesCount({ publishersIds, filter }),
    enabled: publishersIds.length > 0,
  });

  return { seriesCount, error };
};

export default useSeriesesCount;
