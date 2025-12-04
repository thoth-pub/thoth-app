'use client';

import { QueryKeys } from '@/src/shared';
import { ContributorDtoMapper } from '../../model/contributor.mapper';
import { useQuery } from '@tanstack/react-query';
import { ContributorService } from '../contributor.service';

const mapper = new ContributorDtoMapper();

type UseContributorsProps = {
  filter: string;
};

const contributorService = new ContributorService();

const useContributors = ({ filter }: UseContributorsProps) => {
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
