'use client';

import { Direction, WorkField, WorkStatus } from '@/gql/graphql';
import { useSuspenseBooks } from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { EditBookLink } from '@/src/features';

export const BooksList = () => {
  const { activePublisher, isAdmin } = usePublisherStateMachine();
  const publishersIds = activePublisher ? [activePublisher] : [];

  const { books } = useSuspenseBooks({
    publishersIds,
    workStatus: WorkStatus.Active,
    limit: 3,
    direction: Direction.Desc,
    field: WorkField.UpdatedAt,
    isAdmin,
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
