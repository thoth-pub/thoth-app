'use client';

import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import { Header } from './components/Header';
import { WorksTable } from './components/WorksTable';
import { useAllWorks } from './useAllWorks';

const AllWorks = () => {
  const {
    loading,
    works,
    navigateToWork,
    searchValue,
    setSearchValue,
    activePage,
    totalPagesCount,
    changePage,
    direction,
    changeDirection,
    workStatus,
    changeWorkStatus,
    workType,
    changeWorkType,
    orderBy,
    changeOrderBy,
  } = useAllWorks();

  return (
    <>
      <Header
        searchValue={searchValue}
        onSearch={setSearchValue}
        workStatus={workStatus}
        changeWorkStatus={changeWorkStatus}
        workType={workType}
        changeWorkType={changeWorkType}
        direction={direction}
        changeDirection={changeDirection}
        orderBy={orderBy}
        changeOrderBy={changeOrderBy}
      />
      <ContentSection>
        <WorksTable
          loading={loading}
          works={works}
          page={activePage}
          pagesCount={totalPagesCount}
          onPageChange={changePage}
          navigateToWork={navigateToWork}
        />
      </ContentSection>
    </>
  );
};

export default AllWorks;
