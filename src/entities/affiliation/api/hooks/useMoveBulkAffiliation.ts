'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, type QueryToken, useServices } from '@/src/shared';
import { QueryKeys } from '@/src/shared/constants';
import { useNotifications } from '@/src/shared/hooks';

const { AFFILIATION_MOVE_FAILED } = NOTIFICATIONS;

const useMoveBulkAffiliation = (queryToken: QueryToken) => {
  const { affiliationService } = useServices();
  const { sendErrorNotification } = useNotifications();

  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ affiliationId, newOrdinal }: { affiliationId: string; newOrdinal: number }) => {
      return affiliationService.moveAffiliation({ token: queryToken, affiliationId, newOrdinal });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? AFFILIATION_MOVE_FAILED);
    },
  });

  const moveBulkAffiliation = async (data: { affiliationId: string; newOrdinal: number }[]) => {
    const promises = data.map((affiliation) => {
      return mutateAsync(affiliation);
    });

    await Promise.all(promises);

    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
  };

  return {
    moveBulkAffiliation,
    loading: isPending,
  };
};

export default useMoveBulkAffiliation;
