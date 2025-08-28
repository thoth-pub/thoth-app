import { GET_INSTITUTIONS } from '@/app/queries';
import { InstitutionDtoMapper } from '@/app/services/institutionsService/mappers';
import { GetInstitutionsQuery } from '@/gql/graphql';

import useDataWithPagination from './useDataWithPagination';

const dtoMapper = new InstitutionDtoMapper();

export const useInstitutions = (maxDataCount: number) => {
  const { data, isFetchNextDisabled, isFetchPrevDisabled, fetchNextPage, fetchPreviousPage } =
    useDataWithPagination<GetInstitutionsQuery>({
      query: GET_INSTITUTIONS,
      maxDataCount,
    });

  const mappedData = data ? data.institutions.map(dtoMapper.toEntity) : [];

  return {
    data: mappedData,
    isFetchNextDisabled,
    isFetchPrevDisabled,
    fetchNextPage,
    fetchPreviousPage,
  };
};
