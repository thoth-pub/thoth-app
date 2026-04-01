import { useQuery } from '@tanstack/react-query';

import { PublisherId } from '@/src/entities/publisher';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

const useGetPublisherImprints = (publisherId: PublisherId, isSuperuser = false) => {
  const { imprintService } = useServices();

  const { data = [], isLoading } = useQuery({
    queryKey: [QueryKeys.publisherImprints, publisherId, isSuperuser],
    queryFn: () => imprintService.getPublisherImprints(publisherId, isSuperuser),
    enabled: publisherId.length > 0,
  });

  return { data, isLoading };
};

export default useGetPublisherImprints;
