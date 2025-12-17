'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import { BiographyEntity } from '../../model/contribution.types';

const { BIOGRAPHY_UPDATE_FAILED } = NOTIFICATIONS;

export const useUpdateBiography = (workId: WorkId) => {
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();
  const { contributionService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data, contributionId }: { data: BiographyEntity; contributionId: ContributionId }) => {
      return contributionService.updateBiography(queryToken, data, contributionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? BIOGRAPHY_UPDATE_FAILED);
    },
  });

  return { updateBiography: mutateAsync, loading: isPending };
};
