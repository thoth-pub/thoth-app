'use client';

import { NOTIFICATIONS, QueryKeys, type QueryToken } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { WorkEntity } from '../../model/work.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { WorkService } from '../work.service';

type UseCreateWorkProps = {
  queryToken: QueryToken;
  onCompleted: (data: WorkEntity) => void;
};

const { WORK_CREATION_SUCCESS, WORK_CREATION_FAILED } = NOTIFICATIONS;
const { books, booksCount, publishedBooksCount, forthcomingBooksCount, work, worksCount } = QueryKeys;

const workService = new WorkService();

const useCreateWork = (props: UseCreateWorkProps) => {
  const { queryToken, onCompleted } = props;

  const { sendErrorNotification, sendSuccessNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: WorkEntity) => {
      return workService.createWork(queryToken, data);
    },
    onSuccess: (data) => {
      sendSuccessNotification(WORK_CREATION_SUCCESS);

      queryClient.invalidateQueries({
        queryKey: [books, booksCount, publishedBooksCount, forthcomingBooksCount, work, worksCount],
      });

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
