'use client';

import { useQuery } from '@tanstack/react-query';
import type { PublisherId } from '../../model/publisher.types';
import { QueryKeys, useServices } from '@/src/shared';

const usePublishers = (publisherIds: PublisherId[], isAdmin: boolean) => {
  const { publisherService } = useServices();

  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [QueryKeys.publishers, publisherIds],
    queryFn: () => publisherService.getPublishers(publisherIds),
    enabled: publisherIds.length > 0 && !isAdmin,
  });

  return {
    publishers: data,
    isLoading,
    error,
  };
};

export default usePublishers;
