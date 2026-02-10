'use client';

import { Direction } from '@/gql/graphql';
import { useBooks } from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { EditBookLink } from '@/src/features';

export const BooksList = () => {
  const { activePublisher } = usePublisherStateMachine();
  const publishersIds = activePublisher ? [activePublisher.id] : [];

  const { books } = useBooks({
    publishersIds,
    limit: 3,
    direction: Direction.Desc,
  });

  return (
    <>
      {books.map(({ id, titles, coverUrl, type, status, contributions }) => (
        <EditBookLink
          key={id}
          id={id}
          titles={titles}
          type={type}
          status={status}
          contributions={contributions}
          image={coverUrl ?? undefined}
        />
      ))}
    </>
  );
};
