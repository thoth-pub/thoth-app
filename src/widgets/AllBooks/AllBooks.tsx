'use client';

import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import { BooksTable } from './components/BooksTable';
import { Header } from './components/Header';
import { useAllBooks } from './useAllBooks';

const AllBooks = () => {
  const {
    loading,
    books,
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
  } = useAllBooks();

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
        <BooksTable
          loading={loading}
          books={books}
          page={activePage}
          pagesCount={totalPagesCount}
          onPageChange={changePage}
          navigateToWork={navigateToWork}
        />
      </ContentSection>
    </>
  );
};

export default AllBooks;
