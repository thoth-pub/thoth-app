'use client';

import {
  useBookReviewStateMachine,
  useDeleteBookReview,
  useMoveBookReview,
  useUpdateBookReview,
} from '@/src/entities/book-review';
import type { BookReviewEntity } from '@/src/entities/book-review/model/book-review.types';
import { WorkId } from '@/src/entities/work/model/work.types';
import { appConfig } from '@/src/shared/config';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import { isDefaultId } from '@/src/shared/utils';

const defaultBookReview: BookReviewEntity = {
  id: appConfig.defaultId,
  workId: '',
  title: '',
  authorName: '',
  url: '',
  doi: '',
  reviewDate: '',
  journalName: '',
  journalVolume: '',
  journalNumber: '',
  journalIssn: '',
  text: '',
  orderNumber: 0,
};

export const useEditBookReviews = (workId: WorkId, bookReviews: BookReviewEntity[]) => {
  const { activeEntity: activeBookReview, edit } = useBookReviewStateMachine();
  const { activeFormId } = useFormStateMachine();
  const { deleteBookReview: deleteBookReviewMutation, loading: deleteLoading } = useDeleteBookReview();
  const { updateBookReview } = useUpdateBookReview({ workId });
  const { moveBookReview } = useMoveBookReview({ workId });

  const isNewBookReview = activeBookReview ? isDefaultId(activeBookReview.id) : false;

  const editBookReview = (id: string) => {
    const bookReview = bookReviews.find((bookReview) => bookReview.id === id);

    if (!bookReview) return;

    edit({ ...bookReview });
  };

  const addBookReview = () => {
    edit({ ...defaultBookReview });
  };

  const dragEnd = async (data: BookReviewEntity[]) => {
    const updatedData = data.map((bookReview, index) => ({ ...bookReview, orderNumber: index + 1 }));

    const bookReviewToUpdate = updatedData.find((bookReview, index) => bookReviews[index].id !== bookReview.id);

    if (!bookReviewToUpdate) return;

    await moveBookReview({
      bookReviewId: bookReviewToUpdate.id,
      newOrdinal: bookReviewToUpdate.orderNumber,
    });
  };

  const deleteBookReview = async (id: string) => {
    await deleteBookReviewMutation(id);

    const bookReviewsWithUpdatedOrderNumbers = bookReviews
      .filter((bookReview) => bookReview.id !== id)
      .map((bookReview, index) => ({
        ...bookReview,
        orderNumber: index + 1,
      }));

    const promises = bookReviewsWithUpdatedOrderNumbers.map((bookReview) => {
      return updateBookReview({ ...bookReview, orderNumber: bookReview.orderNumber });
    });

    await Promise.all(promises);
  };

  return {
    activeBookReview,
    isNewBookReview,
    editDisabled: !!activeFormId,
    deleteLoading,
    editBookReview,
    addBookReview,
    dragEnd,
    deleteBookReview,
  };
};
