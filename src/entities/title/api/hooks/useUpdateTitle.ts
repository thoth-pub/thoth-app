'use client';
import { useMutation } from '@tanstack/react-query';

import { NOTIFICATIONS } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import { TitleEntity } from '@/src/shared/types';

import type { WorkId } from '../../../work/model/work.types';

const { TITLE_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateTitle = () => {
  const { titleService } = useServices();
  const { sendErrorNotification } = useNotifications();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data, relatedWorkId }: { data: TitleEntity; relatedWorkId: WorkId }) => {
      return titleService.updateTitle(data, relatedWorkId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? TITLE_UPDATE_FAILED);
    },
  });

  return { updateTitle: mutateAsync, loading: isPending };
};

export default useUpdateTitle;
