import { Direction, WorkStatus } from '@/gql/graphql';
import { BooksListWrapper, SectionWrapper, useBooks } from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { EditBookLink } from '@/src/features';

const RecentlyPublishedBooks = () => {
  const { activePublisher } = usePublisherStateMachine();
  const publishersIds = activePublisher ? [activePublisher] : [];

  const { books: recentlyPublishedBooks } = useBooks({
    publishersIds,
    workStatus: WorkStatus.Active,
    limit: 3,
    direction: Direction.Desc,
  });

  return (
    <SectionWrapper title="Recently published">
      <BooksListWrapper>
        {recentlyPublishedBooks.map(({ id, title, coverUrl, type, status, contributions }) => (
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
      </BooksListWrapper>
    </SectionWrapper>
  );
};

export default RecentlyPublishedBooks;
