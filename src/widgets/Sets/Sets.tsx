'use client';

import { useActivePublisherPermissions } from '@/src/entities/publisher';
import useSetStateMachine from '@/src/entities/sets/store/hooks/useSetStateMachine';
import SetsTable from '@/src/entities/sets/ui/SetsTable/SetsTable';
import { EditSet } from '@/src/features';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import { SetsHeader } from './SetsHeader';
import { useSetsTable } from './useSetsTable';

const Sets = () => {
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

  const { isImprintEditable } = useActivePublisherPermissions();

  return (
    <>
      <SetsHeader
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
          form={<EditSet setId={activeSet?.id ?? ''} isImprintEditable={isImprintEditable} />}
        />
      </ContentSection>
    </>
  );
};

export default Sets;
