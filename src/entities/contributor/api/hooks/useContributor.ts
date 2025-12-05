import { isDefaultId, QueryKeys, useServices } from '@/src/shared';

import type { ContributorId } from '../../model/contributor.types';
import { useQuery } from '@tanstack/react-query';

type UseContributorProps = {
  contributorId?: ContributorId;
};

const useContributor = (props: UseContributorProps) => {
  const { contributorId = '' } = props;

  const { contributorService } = useServices();

  const { data, isLoading, error } = useQuery({
    queryKey: [QueryKeys.contributor, contributorId],
    queryFn: () => contributorService.getContributor(contributorId),
    enabled: contributorId.length > 0 && !isDefaultId(contributorId),
  });

  return {
    contributor: data,
    loading: isLoading,
    error: error,
  };
};

export default useContributor;
