'use client';

import { useQuery } from '@tanstack/react-query';

import { useServices } from '@/src/shared/context';

// The distribution-platform option list is code-owned and identical for every
// publisher, so it is cached under a single stable key rather than per publisher.
export const DISTRIBUTION_PLATFORM_OPTIONS_QUERY_KEY = 'distributionPlatformOptions';

const useDistributionPlatformOptions = () => {
  const { publisherService } = useServices();

  const { data, isLoading, error } = useQuery({
    queryKey: [DISTRIBUTION_PLATFORM_OPTIONS_QUERY_KEY],
    queryFn: () => publisherService.getDistributionPlatformOptions(),
  });

  return {
    distributionPlatformOptions: data,
    isLoading,
    error,
  };
};

export default useDistributionPlatformOptions;
