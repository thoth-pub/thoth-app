'use client';

import { isDefaultId, QueryKeys, useServices } from '@/src/shared';

import type { ContributorId } from '../../model/contributor.types';
import { useQuery } from '@tanstack/react-query';

type UseContributorProps = {
  id?: ContributorId;
};

const useLinkedPublishers = ({ id = '' }: UseContributorProps) => {
  const { contributorService } = useServices();

  const {
    data: linkedPublishers = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: [QueryKeys.linkedPublishers, id],
    queryFn: () => contributorService.getLinkedPublishers(id),
    enabled: id.length > 0 && !isDefaultId(id),
  });

  return {
    contributedToPublishers: linkedPublishers,
    loading: isLoading,
    error: error,
  };
};

export default useLinkedPublishers;
