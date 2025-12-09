'use client';

import { useQuery } from '@tanstack/react-query';

import { appConfig, QueryKeys, useServices } from '@/src/shared';

type UseContributorsProps = {
  filter: string;
};

const useInstitutions = (props: UseContributorsProps) => {
  const { filter } = props;

  const { institutionService } = useServices();

  const {
    data = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: [QueryKeys.institutions, filter],
    queryFn: () => institutionService.getInstitutions(0, appConfig.data.maxItemsPerRequestLimit, filter),
    enabled: filter.length > 0,
  });

  return {
    institutions: data,
    error,
    loading: isLoading,
  };
};

export default useInstitutions;
