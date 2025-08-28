'use client';

import { useInstitutions } from '@/app/hooks/data/useInstitutionts';
import { Button } from '@/components';

const TestList = ({ maxDataCount }: { maxDataCount: number }) => {
  const { data, isFetchNextDisabled, isFetchPrevDisabled, fetchNextPage, fetchPreviousPage } =
    useInstitutions(maxDataCount);

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
