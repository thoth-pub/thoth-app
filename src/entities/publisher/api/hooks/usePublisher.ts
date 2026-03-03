'use client';

import { useQuery } from '@tanstack/react-query';

import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

import type { PublisherId } from '../../model/publisher.types';

const usePublisher = (publisherId: PublisherId) => {
  const { publisherService } = useServices();

  const { data, isLoading, error } = useQuery({
    queryKey: [QueryKeys.publisher, publisherId],
    queryFn: () => publisherService.getPublisher(publisherId),
    enabled: publisherId.length > 0,
  });

  return {
    publisher: data,
    isLoading,
    error,
  };
};

export default usePublisher;
