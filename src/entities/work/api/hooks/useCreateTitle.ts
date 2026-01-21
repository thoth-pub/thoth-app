'use client';
import { useMutation } from '@tanstack/react-query';

import { NOTIFICATIONS, type TitleEntity, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import type { WorkId } from '../../model/work.types';

const { TITLE_CREATION_FAILED } = NOTIFICATIONS;

const useCreateTitle = () => {
  const { workService } = useServices();
  const { sendErrorNotification } = useNotifications();
  const queryToken = useQueryToken();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({
      data,
      relatedWorkId,
    }: {
      data: TitleEntity;
      relatedWorkId: WorkId;
    }) => {
      return workService.createTitle(queryToken, data, relatedWorkId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? TITLE_CREATION_FAILED);
    },
  });

  return { createTitle: mutateAsync, loading: isPending };
};

export default useCreateTitle;
