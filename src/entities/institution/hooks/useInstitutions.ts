'use client';

import { useSuspenseQuery } from '@apollo/client/react';
import { useEffect, useMemo } from 'react';

import { GetInstitutionsQuery } from '@/gql/graphql';
import { useDataWithPagination, useFilter } from '@/src/shared/hooks';

import { InstitutionDtoMapper } from '../model/institution.mapper';
import { GET_INSTITUTIONS, GET_INSTITUTIONS_COUNT } from '../model/institution.schema';

const dtoMapper = new InstitutionDtoMapper();

const useInstitutions = () => {
  const { filter, debouncedFilter, updateFilter } = useFilter();

  const { data: institutionsCount } = useSuspenseQuery(GET_INSTITUTIONS_COUNT, {
    variables: {
      filter: debouncedFilter,
    },
  });

  const { data, offset, isFetchNextDisabled, isFetchPrevDisabled, fetchNextPage, fetchPreviousPage, resetOffset } =
    useDataWithPagination<GetInstitutionsQuery>({
      query: GET_INSTITUTIONS,
      maxDataCount: institutionsCount.institutionCount,
      filter: debouncedFilter,
    });

  useEffect(() => {
    if (offset === 0) return;

    resetOffset();
  }, [debouncedFilter]);

  const mappedData = useMemo(() => {
    if (!data) return [];

    return data.institutions.map(dtoMapper.toEntity);
  }, [data]);

  return {
    data: mappedData,
    isFetchNextDisabled,
    isFetchPrevDisabled,
    fetchNextPage,
    fetchPreviousPage,
    filter,
    updateFilter,
  };
};

export default useInstitutions;
