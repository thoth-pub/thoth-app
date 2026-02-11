'use client';

import { WorkEntity } from '@/src/entities/work/model/work.types';
import { EditBookLink } from '@/src/features';

type BooksListProps = {
  books: WorkEntity[];
};

export const BooksList = ({ books }: BooksListProps) => {
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
