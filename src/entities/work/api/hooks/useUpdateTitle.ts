'use client';
import { useMutation } from '@tanstack/react-query';

import { MarkdownFormat, NOTIFICATIONS, type TitleEntity, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import type { WorkId } from '../../model/work.types';

const { TITLE_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateTitle = () => {
  const { workService } = useServices();
  const { sendErrorNotification } = useNotifications();
  const queryToken = useQueryToken();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({
      data,
      relatedWorkId,
      markupFormat,
    }: {
      data: TitleEntity;
      relatedWorkId: WorkId;
      markupFormat: MarkdownFormat;
    }) => {
      return workService.updateTitle(queryToken, data, relatedWorkId, markupFormat);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? TITLE_UPDATE_FAILED);
    },
  });

  return { updateTitle: mutateAsync, loading: isPending };
};

export default useUpdateTitle;
