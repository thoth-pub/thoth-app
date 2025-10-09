'use client';

import { useQuery } from '@apollo/client/react';

import { PublisherDtoMapper } from '../../model/publisher.mapper';
import { GET_PUBLISHERS } from '../../model/publisher.schema';
import type { PublisherId } from '../../model/publisher.types';

const mapper = new PublisherDtoMapper();

const usePublishers = (publisherIds: PublisherId[]) => {
  const { data: { publishers } = { publishers: [] }, error } = useQuery(GET_PUBLISHERS, {
    variables: { publishers: publisherIds, offset: 0 },
    skip: publisherIds.length === 0,
  });

  const data = publishers.map(mapper.toEntity);

  return {
    publishers: data,
    error,
  };
};

export default usePublishers;
