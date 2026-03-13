import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { AwardId } from '../../model/award.types';

const { AWARD_MOVE_FAILED } = NOTIFICATIONS;

export default function useMoveAward(props: BaseEditSectionProps) {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { awardService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ awardId, newOrdinal }: { awardId: AwardId; newOrdinal: number }) => {
      return awardService.moveAward(awardId, newOrdinal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? AWARD_MOVE_FAILED);
    },
  });

  return {
    moveAward: mutateAsync,
    loading: isPending,
  };
}
