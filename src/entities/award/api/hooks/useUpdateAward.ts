import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { AwardEntity } from '../../model/award.types';

const { AWARD_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateAward = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { awardService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: AwardEntity) => {
      return awardService.updateAward(data, workId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? AWARD_UPDATE_FAILED);
    },
  });

  return {
    updateAward: mutateAsync,
    loading: isPending,
  };
};

export default useUpdateAward;
