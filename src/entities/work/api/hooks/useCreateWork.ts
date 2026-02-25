'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { WorkEntity } from '../../model/work.types';

type UseCreateWorkProps = {
  onCompleted: (data: WorkEntity) => void;
};

const { WORK_CREATION_SUCCESS, WORK_CREATION_FAILED } = NOTIFICATIONS;

const useCreateWork = (props: UseCreateWorkProps) => {
  const { onCompleted } = props;

  const { sendErrorNotification, sendSuccessNotification } = useNotifications();
  const { workService } = useServices();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: WorkEntity) => {
      return workService.createWork(data);
    },
    onSuccess: (data) => {
      sendSuccessNotification(WORK_CREATION_SUCCESS);

      queryClient.invalidateQueries({ queryKey: [QueryKeys.books] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.booksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.forthcomingBooksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.publishedBooksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.latestUpdatedBooks] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.latestPublishedBooks] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.works] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.worksCount] });

      onCompleted(data);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? WORK_CREATION_FAILED);
    },
  });

  return {
    createWork: mutate,
    loading: isPending,
  };
};

export default useCreateWork;
