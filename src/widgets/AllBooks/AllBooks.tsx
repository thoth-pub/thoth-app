'use client';

import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import { BooksTable } from './components/BooksTable';
import { Header } from './components/Header';
import { TableFooter } from './components/TableFooter';
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
  } = useAllBooks();

  return (
    <>
      <Header searchValue={searchValue} onSearch={setSearchValue} />
      <ContentSection>
        <BooksTable loading={loading} books={books} navigateToWork={navigateToWork} />
        <TableFooter
          direction={direction}
          page={activePage}
          pagesCount={totalPagesCount}
          workStatus={workStatus}
          loading={loading}
          onDirectionChange={changeDirection}
          onPageChange={changePage}
          onWorkStatusChange={changeWorkStatus}
        />
      </ContentSection>
    </>
  );
};

export default AllBooks;
