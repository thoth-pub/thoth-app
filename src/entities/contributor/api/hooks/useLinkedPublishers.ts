'use client';

import { useQuery } from '@apollo/client/react';
import { useEffect, useRef, useState } from 'react';

import type { GetLinkedPublishersQuery } from '@/gql/graphql';
import type { PublisherId } from '@/src/entities/publisher';
import { appConfig, isDefaultId } from '@/src/shared';

import { ContributorDtoMapper } from '../../model/contributor.mapper';
import { GET_LINKED_PUBLISHERS } from '../../model/contributor.schema';
import type { ContributorId } from '../../model/contributor.types';

const mapper = new ContributorDtoMapper();

type UseContributorProps = {
  id?: ContributorId;
};

const { maxItemsPerRequestLimit } = appConfig.data;

const useLinkedPublishers = ({ id = '' }: UseContributorProps) => {
  const [offset, setOffset] = useState(0);
  const {
    data: linkedPublishersData = { contributor: { contributions: [] } },
    loading,
    error,
  } = useQuery<GetLinkedPublishersQuery>(GET_LINKED_PUBLISHERS, {
    variables: { contributorId: id, offset, limit: maxItemsPerRequestLimit },
    skip: id.length === 0 || isDefaultId(id),
  });
  const data = mapper.toLinkedPublishers(linkedPublishersData);
  const linkedPublishers = useRef<PublisherId[]>(data);

  useEffect(() => {
    linkedPublishers.current = [];
  }, [id]);

  useEffect(() => {
    if (error && loading) return;

    if (data.length === 0) {
      return;
    }

    linkedPublishers.current = [...linkedPublishers.current, ...data];
    setOffset(offset + maxItemsPerRequestLimit);
  }, [data, error, loading]);

  return {
    contributedToPublishers: linkedPublishers.current,
    loading,
  };
};

export default useLinkedPublishers;
