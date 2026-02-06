import { Suspense } from 'react';

import { BooksListWrapper, SectionWrapper } from '@/src/entities/book';
import { EditWorkSkeleton } from '@/src/features';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { TranslatedContent } from '@/src/shared/ui';

import { BooksList } from './components/BooksList';

const RecentlyPublishedBooks = () => {
  return (
    <SectionWrapper
      title={<TranslatedContent content="widgets.recently published" namespace={NAMESPACES.enum.dashboard} />}
    >
      <BooksListWrapper>
        <Suspense fallback={<EditWorkSkeleton />}>
          <BooksList />
        </Suspense>
      </BooksListWrapper>
    </SectionWrapper>
  );
};

export default RecentlyPublishedBooks;
