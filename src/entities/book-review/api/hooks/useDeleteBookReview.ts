'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import type { BookReviewId } from '../../model/book-review.types';

const { BOOK_REVIEW_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteBookReview = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { bookReviewService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (bookReviewId: BookReviewId) => {
      return bookReviewService.deleteBookReview(bookReviewId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? BOOK_REVIEW_DELETE_FAILED);
    },
  });

  return {
    deleteBookReview: mutateAsync,
    loading: isPending,
  };
};

export default useDeleteBookReview;
