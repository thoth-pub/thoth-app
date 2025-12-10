'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

const { WORK_MOVE_RELATION_FAILED } = NOTIFICATIONS;

export const useWorkMoveRelation = () => {
  const { sendErrorNotification } = useNotifications();
  const queryToken = useQueryToken();
  const { workService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ workRelationId, newOrdinal }: { workRelationId: string; newOrdinal: number }) => {
      return workService.moveWorkRelation(queryToken, workRelationId, newOrdinal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? WORK_MOVE_RELATION_FAILED);
    },
  });

  return {
    moveWorkRelation: mutateAsync,
    loading: isPending,
  };
};

export default useWorkMoveRelation;
