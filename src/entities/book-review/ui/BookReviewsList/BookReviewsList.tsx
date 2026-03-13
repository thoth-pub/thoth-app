import { CardsList } from '@/src/shared/ui';

import { BookReviewEntity } from '../../model/book-review.types';
import { BookReviewCardListItem } from './components/BookReviewCardListItem';

type BookReviewsListProps = {
  activeBookReview: BookReviewEntity | null;
  bookReviews: BookReviewEntity[];
  form?: Readonly<React.ReactNode>;
  loading?: boolean;
  editDisabled?: boolean;
  deleteLoading?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDragEnd?: (data: BookReviewEntity[]) => void;
};

const BookReviewsList = (props: BookReviewsListProps) => {
  const {
    activeBookReview,
    bookReviews,
    form,
    loading = false,
    editDisabled = false,
    deleteLoading = false,
    onDelete,
    onEdit,
    onDragEnd,
  } = props;

  if (bookReviews.length === 0) return null;

  return (
    <CardsList items={bookReviews} draggable={bookReviews.length > 1} loading={loading} onDragEnd={onDragEnd}>
      {(draggable) => (
        <>
          {bookReviews.map((bookReview) => (
            <BookReviewCardListItem
              key={bookReview.id}
              bookReview={bookReview}
              draggable={draggable}
              editing={activeBookReview?.id === bookReview.id}
              form={form}
              editDisabled={editDisabled}
              deleteLoading={deleteLoading}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </>
      )}
    </CardsList>
  );
};

export default BookReviewsList;
