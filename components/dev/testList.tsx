'use client';

import { useDataWithPagination } from '@/app/hooks';
import { GET_INSTITUTIONS } from '@/app/queries';
import { InstitutionDtoMapper } from '@/app/services/institutionsService/mappers';
import { Button } from '@/components';
import { GetInstitutionsQuery } from '@/gql/graphql';
import { InstitutionDto, InstitutionEntity } from '@/interfaces';

const dtoMapper = new InstitutionDtoMapper();

const TestList = ({ maxDataCount }: { maxDataCount: number }) => {
  const { data, isFetchNextDisabled, isFetchPrevDisabled, fetchNextPage, fetchPreviousPage } = useDataWithPagination<
    GetInstitutionsQuery,
    InstitutionDto,
    InstitutionEntity
  >({
    query: GET_INSTITUTIONS,
    maxDataCount,
    dtoMapper,
  });

  return (
    <div>
      <div className="flex gap-2">
        <Button variant="contained" onClick={fetchPreviousPage} disabled={isFetchPrevDisabled}>
          Load previous
        </Button>
        <Button variant="contained" onClick={fetchNextPage} disabled={isFetchNextDisabled}>
          Load more
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        {data?.map(({ id, name, doi, ror, countryCode, updatedAt }) => (
          <li key={id} className="flex gap-2">
            <span>{id}</span>
            <span>{name}</span>
            <span>{doi}</span>
            <span>{ror}</span>
            <span>{countryCode}</span>
            <span>{updatedAt}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TestList;
