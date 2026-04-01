'use client';

import { useQuery } from '@tanstack/react-query';

import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { isDefaultId } from '@/src/shared/utils';

import type { ContributorId } from '../../model/contributor.types';

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
