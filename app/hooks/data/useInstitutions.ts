import { useSuspenseQuery } from '@apollo/client/react';
import { useEffect, useMemo } from 'react';

import { GET_INSTITUTIONS, GET_INSTITUTIONS_COUNT } from '@/app/queries';
import { InstitutionDtoMapper } from '@/app/services/institutionsService/mappers';
import { GetInstitutionsQuery } from '@/gql/graphql';

import useFilter from '../core/useFilter';
import useDataWithPagination from './useDataWithPagination';

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
