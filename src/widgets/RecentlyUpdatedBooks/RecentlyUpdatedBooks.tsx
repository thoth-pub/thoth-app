import { Suspense } from 'react';

import { BooksListWrapper, SectionWrapper } from '@/src/entities/book';
import { EditWorkSkeleton } from '@/src/features';

import { BooksList } from './components/BooksList';

const RecentlyPublishedBooks = () => {
  return (
    <SectionWrapper title="Recently updated">
      <BooksListWrapper>
        <Suspense fallback={<EditWorkSkeleton />}>
          <BooksList />
        </Suspense>
      </BooksListWrapper>
    </SectionWrapper>
  );
};

export default RecentlyPublishedBooks;
