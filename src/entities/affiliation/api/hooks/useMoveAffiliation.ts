'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import { BaseEditSectionProps } from '@/src/shared/types';

const { AFFILIATION_MOVE_FAILED } = NOTIFICATIONS;

const useMoveAffiliation = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { affiliationService } = useServices();
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ affiliationId, newOrdinal }: { affiliationId: string; newOrdinal: number }) => {
      return affiliationService.moveAffiliation({ affiliationId, newOrdinal });
    },
    onSuccess: () => {
      if (workId.length === 0) return;

      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? AFFILIATION_MOVE_FAILED);
    },
  });

  return {
    moveAffiliation: mutateAsync,
    loading: isPending,
  };
};

export default useMoveAffiliation;
