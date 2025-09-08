'use client';

import { Button, TextField } from '@mui/material';

import { useInstitutions } from '@/src/entities/institution';

const TestList = () => {
  const { data, isFetchNextDisabled, isFetchPrevDisabled, fetchNextPage, fetchPreviousPage, filter, updateFilter } =
    useInstitutions();

  return (
    <div>
      <div className="flex gap-2">
        <Button variant="contained" onClick={fetchPreviousPage} disabled={isFetchPrevDisabled}>
          Load previous
        </Button>
        <TextField label="Filter" type="text" value={filter} onChange={(e) => updateFilter(e.target.value)} />
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
