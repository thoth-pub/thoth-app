'use client';

import { appConfig, QueryKeys } from '@/src/shared';

import { useQuery } from '@tanstack/react-query';
import { InstitutionService } from '../institution.service';

type UseContributorsProps = {
  filter: string;
};

const institutionService = new InstitutionService();

const useInstitutions = (props: UseContributorsProps) => {
  const { filter } = props;

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
