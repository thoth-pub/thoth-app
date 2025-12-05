'use client';

import { QueryKeys, useServices } from '@/src/shared';
import { useQuery } from '@tanstack/react-query';

type UseContributorsProps = {
  filter: string;
};

const useContributors = ({ filter }: UseContributorsProps) => {
  const { contributorService } = useServices();

  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [QueryKeys.contributors, filter],
    queryFn: () => contributorService.getContributors(filter),
    enabled: filter.length > 0,
  });

  return {
    contributors: data,
    loading: isLoading,
    error: error,
  };
};

export default useContributors;
