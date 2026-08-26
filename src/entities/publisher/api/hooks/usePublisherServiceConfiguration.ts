'use client';

import { useQuery } from '@tanstack/react-query';

import { useServices } from '@/src/shared/context';

import type { PublisherId } from '../../model/publisher.types';

// Query-key base for the protected publisher service-configuration read. Scoped
// per active publisher below so a change of active publisher can never surface a
// cached configuration belonging to another publisher. Kept local because the
// shared QueryKeys registry is outside this task's write budget.
export const PUBLISHER_SERVICE_CONFIGURATION_QUERY_KEY = 'publisherServiceConfiguration';

const usePublisherServiceConfiguration = (publisherId: PublisherId) => {
  const { publisherService } = useServices();

  const { data, isLoading, error } = useQuery({
    queryKey: [PUBLISHER_SERVICE_CONFIGURATION_QUERY_KEY, publisherId],
    queryFn: () => publisherService.getPublisherServiceConfiguration(publisherId),
    enabled: publisherId.length > 0,
  });

  return {
    serviceConfiguration: data,
    isLoading,
    error,
  };
};

export default usePublisherServiceConfiguration;
