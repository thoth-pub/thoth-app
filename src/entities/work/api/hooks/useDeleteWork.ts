'use client';

import { useRouter } from 'next/navigation';

import { type BaseEditSectionProps, NOTIFICATIONS, QueryKeys, ROUTES } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { WorkService } from '../work.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const { WORK_DELETE_FAILED } = NOTIFICATIONS;

type UseDeleteWorkProps = Omit<BaseEditSectionProps, 'workId'> & {
  redirect?: boolean;
};

const workService = new WorkService();

const useDeleteWork = ({ queryToken, redirect = true }: UseDeleteWorkProps) => {
  const router = useRouter();
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (workId: string) => {
      return workService.deleteWork(queryToken, workId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });

      if (redirect) {
        router.replace(ROUTES.WORKS);
      }
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? WORK_DELETE_FAILED);
    },
  });

  return {
    deleteWork: mutateAsync,
    loading: isPending,
  };
};

export default useDeleteWork;
