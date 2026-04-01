'use client';
import { useMutation } from '@tanstack/react-query';

import { NOTIFICATIONS } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import type { TitleEntity } from '@/src/shared/types';

import type { WorkId } from '../../../work/model/work.types';

const { TITLE_CREATION_FAILED } = NOTIFICATIONS;

const useCreateTitle = () => {
  const { titleService } = useServices();
  const { sendErrorNotification } = useNotifications();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data, relatedWorkId }: { data: TitleEntity; relatedWorkId: WorkId }) => {
      return titleService.createTitle(data, relatedWorkId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? TITLE_CREATION_FAILED);
    },
  });

  return { createTitle: mutateAsync, loading: isPending };
};

export default useCreateTitle;
