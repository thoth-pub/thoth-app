'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import type { WorkId } from '../../model/work.types';

const { TITLE_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteTitle = (workId: WorkId) => {
  const { workService } = useServices();
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (titleId: string) => {
      return workService.deleteTitle(titleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.set, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workTranslations, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.translatedWorks, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workEditions, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workPrevEditions, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.works] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.books] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.forthcomingBooksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.publishedBooksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.serieses] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.series] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.sets] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? TITLE_DELETE_FAILED);
    },
  });

  return { deleteTitle: mutateAsync, loading: isPending };
};

export default useDeleteTitle;
