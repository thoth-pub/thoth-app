'use client';

import useSetStateMachine from '@/src/entities/sets/store/hooks/useSetStateMachine';
import SetsTable from '@/src/entities/sets/ui/SetsTable/SetsTable';
import { EditSetForm } from '@/src/features/sets/EditSet/EditSet';
import { FormFieldOption } from '@/src/shared';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import { SetsHeader } from './SetsHeader';
import { useSetsTable } from './useSetsTable';

type SetsProps = {
  imprintOptions: FormFieldOption[];
};

const Sets = (props: SetsProps) => {
  const { imprintOptions } = props;

  const { activeSet } = useSetStateMachine();

  const {
    loading,
    sets,
    activePage,
    totalPagesCount,
    direction,
    orderBy,
    searchValue,
    setSearchValue,
    changeDirection,
    changeOrderBy,
    changePage,
  } = useSetsTable();

  return (
    <>
      <SetsHeader
        imprintOptions={imprintOptions}
        searchValue={searchValue}
        direction={direction}
        orderBy={orderBy}
        onSearch={setSearchValue}
        changeDirection={changeDirection}
        changeOrderBy={changeOrderBy}
      />
      <ContentSection>
        <SetsTable
          loading={loading}
          sets={sets}
          page={activePage}
          pagesCount={totalPagesCount}
          onPageChange={changePage}
          form={<EditSetForm setId={activeSet?.id ?? ''} imprintOptions={imprintOptions} />}
        />
      </ContentSection>
    </>
  );
};

export default Sets;
