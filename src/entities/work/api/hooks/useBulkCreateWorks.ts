'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, SeriesForUpdateItems, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { WorkEntity } from '../../model/work.types';

const { WORK_BULK_CREATION_SUCCESS, WORK_BULK_CREATION_FAILED } = NOTIFICATIONS;

const useBulkCreateWorks = () => {
  const { sendErrorNotification, sendSuccessNotification } = useNotifications();
  const { workService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({
      works,
      serieses,
      chapters,
    }: {
      works: WorkEntity[];
      serieses: SeriesForUpdateItems;
      chapters: WorkEntity[];
    }) => {
      return workService.bulkCreateWorks(works, serieses, chapters);
    },
    onSuccess: () => {
      sendSuccessNotification(WORK_BULK_CREATION_SUCCESS);
      queryClient.invalidateQueries({ queryKey: [QueryKeys.books] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.booksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.forthcomingBooksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.publishedBooksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.works] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.worksCount] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? WORK_BULK_CREATION_FAILED);
    },
  });

  return {
    bulkCreateWorks: mutateAsync,
    loading: isPending,
  };
};

export default useBulkCreateWorks;
