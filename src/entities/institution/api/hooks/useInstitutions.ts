'use client';

import { useQuery } from '@apollo/client/react';

import { appConfig } from '@/src/shared';

import { InstitutionDtoMapper } from '../../model/institution.mapper';
import { GET_INSTITUTIONS } from '../../model/institution.schema';

const mapper = new InstitutionDtoMapper();

type UseContributorsProps = {
  filter: string;
};

const useInstitutions = (props: UseContributorsProps) => {
  const { filter } = props;

  const { data = { institutions: [] }, loading } = useQuery(GET_INSTITUTIONS, {
    variables: { filter, offset: 0, limit: appConfig.data.maxItemsPerRequestLimit },
    skip: filter.length === 0,
  });

  const institutions = data.institutions.map(mapper.toEntity);

  return {
    institutions,
    loading,
  };
};

export default useInstitutions;
