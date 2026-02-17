import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import type { FundingId } from '../../model/funding.types';

const { FUNDING_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteFunding = () => {
  const { sendErrorNotification } = useNotifications();
  const { fundingService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (fundingId: FundingId) => {
      return fundingService.deleteFunding({ fundingId });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? FUNDING_DELETE_FAILED);
    },
  });

  const deleteFunding = async (fundingId: FundingId) => {
    await mutateAsync(fundingId);
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
  };

  const deleteFundings = async (fundingIds: FundingId[]) => {
    await Promise.all(fundingIds.map((fundingId) => mutateAsync(fundingId)));
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
  };

  return {
    deleteFunding,
    deleteFundings,
    loading: isPending,
  };
};

export default useDeleteFunding;
