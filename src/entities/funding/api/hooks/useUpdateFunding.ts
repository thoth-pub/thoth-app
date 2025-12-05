import { useMutation, useQueryClient } from '@tanstack/react-query';

import { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { FundingEntity } from '../../model/funding.types';

const { FUNDING_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateFunding = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { fundingService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data, relatedWorkId }: { data: FundingEntity; relatedWorkId: WorkId }) => {
      return fundingService.updateFunding({ token: queryToken, data, relatedWorkId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? FUNDING_UPDATE_FAILED);
    },
  });

  const updateFunding = async (data: FundingEntity, relatedWorkId: WorkId = workId) => {
    await mutateAsync({ data, relatedWorkId });
  };

  const updateFundings = async (data: FundingEntity, relatedWorkIds: WorkId[]) => {
    await Promise.all(relatedWorkIds.map((relatedWorkId) => mutateAsync({ data, relatedWorkId })));
  };

  return {
    updateFunding,
    updateFundings,
    loading: isPending,
  };
};

export default useUpdateFunding;
