'use client';

import { WorkEntity } from '@/src/entities/work/model/work.types';
import { EditBookLink } from '@/src/features';
import { DashboardGrid, DashboardGridItem } from '@/src/shared/ui';

type BooksListProps = {
  books: WorkEntity[];
};

export const BooksList = ({ books }: BooksListProps) => {
  return (
    <DashboardGrid>
      {books.map(({ id, titles, coverUrl, type, status, contributions }) => (
        <DashboardGridItem key={id}>
          <EditBookLink
            id={id}
            titles={titles}
            type={type}
            status={status}
            contributions={contributions}
            image={coverUrl ?? undefined}
          />
        </DashboardGridItem>
      ))}
    </DashboardGrid>
  );
};
