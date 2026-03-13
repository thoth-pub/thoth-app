'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import type { AwardId } from '../../model/award.types';

const { AWARD_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteAward = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { awardService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (awardId: AwardId) => {
      return awardService.deleteAward(awardId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? AWARD_DELETE_FAILED);
    },
  });

  return {
    deleteAward: mutateAsync,
    loading: isPending,
  };
};

export default useDeleteAward;
