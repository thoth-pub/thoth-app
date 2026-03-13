import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { BookReviewId } from '../../model/book-review.types';

const { BOOK_REVIEW_MOVE_FAILED } = NOTIFICATIONS;

export default function useMoveBookReview(props: BaseEditSectionProps) {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { bookReviewService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ bookReviewId, newOrdinal }: { bookReviewId: BookReviewId; newOrdinal: number }) => {
      return bookReviewService.moveBookReview(bookReviewId, newOrdinal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? BOOK_REVIEW_MOVE_FAILED);
    },
  });

  return {
    moveBookReview: mutateAsync,
    loading: isPending,
  };
}
