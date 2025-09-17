'use client';

import { useQuery } from '@apollo/client/react';

import { ContributorDtoMapper } from '../../model/contributor.mapper';
import { GET_CONTRIBUTORS } from '../../model/contributor.schema';

const mapper = new ContributorDtoMapper();

type UseContributorsProps = {
  filter: string;
};

const useContributors = ({ filter }: UseContributorsProps) => {
  const { data = { contributors: [] }, loading } = useQuery(GET_CONTRIBUTORS, {
    variables: { filter },
    skip: filter.length === 0,
  });

  const contributors = data.contributors.map(mapper.toEntity);

  return {
    contributors: contributors,
    loading,
  };
};

export default useContributors;
