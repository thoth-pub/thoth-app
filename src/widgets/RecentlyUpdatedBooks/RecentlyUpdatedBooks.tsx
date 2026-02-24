'use client';

import { Direction } from '@/gql/graphql';
import { SectionWrapper, useBooks } from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { TranslatedContent } from '@/src/shared/ui';

import { BooksList } from './components/BooksList';

const RecentlyPublishedBooks = () => {
  const { activePublisher } = usePublisherStateMachine();
  const publishersIds = activePublisher ? [activePublisher.id] : [];

  const { books } = useBooks({
    publishersIds,
    limit: 3,
    direction: Direction.Desc,
  });

  if (books.length === 0) return null;

  return (
    <SectionWrapper
      title={<TranslatedContent content="widgets.recently updated" namespace={NAMESPACES.enum.dashboard} />}
    >
      <BooksList books={books} />
    </SectionWrapper>
  );
};

export default RecentlyPublishedBooks;
