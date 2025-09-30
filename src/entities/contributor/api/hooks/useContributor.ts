import { useQuery } from '@apollo/client/react';

import { isDefaultId } from '@/src/shared';

import { ContributorDtoMapper } from '../../model/contributor.mapper';
import { GET_CONTRIBUTOR } from '../../model/contributor.schema';
import type { ContributorDto, ContributorId } from '../../model/contributor.types';

type UseContributorProps = {
  contributorId?: ContributorId;
};

const mapper = new ContributorDtoMapper();

const useContributor = (props: UseContributorProps) => {
  const { contributorId } = props;

  const {
    data = { contributor: {} },
    loading,
    error,
  } = useQuery(GET_CONTRIBUTOR, {
    variables: { contributorId },
    skip: !contributorId || isDefaultId(contributorId),
  });

  const contributor = mapper.toEntity(data.contributor as ContributorDto);

  return {
    contributor,
    loading,
    error,
  };
};

export default useContributor;
