'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { WorkEntity } from '../../model/work.types';

const { WORK_UPDATE_FAILED } = NOTIFICATIONS;

export const useUpdateWork = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { sendErrorNotification } = useNotifications();
  const { workService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: WorkEntity) => {
      return workService.updateWork(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workTranslations, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.translatedWorks, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workEditions, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workPrevEditions, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.works] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.books] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.forthcomingBooksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.publishedBooksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.latestUpdatedBooks] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.latestPublishedBooks] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.serieses] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.series] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.sets] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? WORK_UPDATE_FAILED);
    },
  });

  return {
    updateWork: mutateAsync,
    loading: isPending,
  };
};
