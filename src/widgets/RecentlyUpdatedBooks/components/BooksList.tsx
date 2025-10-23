'use client';

import { Direction } from '@/gql/graphql';
import { useSuspenseBooks } from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { EditBookLink } from '@/src/features';

export const BooksList = () => {
  const { activePublisher } = usePublisherStateMachine();
  const publishersIds = activePublisher ? [activePublisher] : [];

  const { books } = useSuspenseBooks({
    publishersIds,
    limit: 3,
    direction: Direction.Desc,
  });

  return (
    <>
      {books.map(({ id, title, coverUrl, type, status, contributions }) => (
        <EditBookLink
          key={id}
          id={id}
          title={title}
          type={type}
          status={status}
          contributions={contributions}
          image={coverUrl ?? undefined}
        />
      ))}
    </>
  );
};
