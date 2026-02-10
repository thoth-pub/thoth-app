import { BooksListWrapper, SectionWrapper } from '@/src/entities/book';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { TranslatedContent } from '@/src/shared/ui';

import { BooksList } from './components/BooksList';

const RecentlyPublishedBooks = () => {
  return (
    <SectionWrapper
      title={<TranslatedContent content="widgets.recently published" namespace={NAMESPACES.enum.dashboard} />}
    >
      <BooksListWrapper>
        <BooksList />
      </BooksListWrapper>
    </SectionWrapper>
  );
};

export default RecentlyPublishedBooks;
