'use client';

import { BookReviewsList } from '@/src/entities/book-review';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { AddButton, TranslatedContent, Typography } from '@/src/shared/ui';

import AddBookReview from '../../../features/book-review/AddBookReview/AddBookReview';
import EditBookReview from '../../../features/book-review/EditBookReview/EditBookReview';
import { useEditBookReviews } from '../hooks/useEditBookReviews';

type BookReviewsSectionProps = {
  workId: WorkId;
};

export const BookReviewsSection = ({ workId }: BookReviewsSectionProps) => {
  const {
    bookReviews,
    activeBookReview,
    isNewBookReview,
    editDisabled,
    deleteLoading,
    editBookReview,
    addBookReview,
    dragEnd,
    deleteBookReview,
  } = useEditBookReviews(workId);

  return (
    <>
      <Typography variant="h2" className="pl-4">
        <TranslatedContent content="book reviews" />
      </Typography>
      <BookReviewsList
        activeBookReview={activeBookReview}
        bookReviews={bookReviews}
        form={<EditBookReview workId={workId} />}
        editDisabled={editDisabled}
        deleteLoading={deleteLoading}
        onDelete={deleteBookReview}
        onEdit={editBookReview}
        onDragEnd={dragEnd}
      />
      {isNewBookReview && <AddBookReview workId={workId} bookReviews={bookReviews} />}
      <AddButton className="px-4 capitalize" onAdd={addBookReview} disabled={isNewBookReview}>
        <TranslatedContent content="actions.addNewBookReview" />
      </AddButton>
    </>
  );
};
