'use client';

import { SectionWrapper, useLatestPublishedBooks } from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { TranslatedContent } from '@/src/shared/ui';

import { BooksList } from './components/BooksList';

const RecentlyPublishedBooks = () => {
  const { activePublisher } = usePublisherStateMachine();
  const publishersIds = activePublisher && activePublisher.id ? [activePublisher.id] : [];

  const { books } = useLatestPublishedBooks(publishersIds);

  if (books.length === 0) return null;

  return (
    <SectionWrapper
      title={<TranslatedContent content="widgets.recently published" namespace={NAMESPACES.enum.dashboard} />}
    >
      <BooksList books={books} />
    </SectionWrapper>
  );
};

export default RecentlyPublishedBooks;
