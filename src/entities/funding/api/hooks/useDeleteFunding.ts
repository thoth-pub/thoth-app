import { NOTIFICATIONS, QueryKeys } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import type { FundingId } from '../../model/funding.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FundingService } from '../funding.service';

const { FUNDING_DELETE_FAILED } = NOTIFICATIONS;

const fundingService = new FundingService();

const useDeleteFunding = (props: BaseEditSectionProps) => {
  const { queryToken } = props;

  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (fundingId: FundingId) => {
      return fundingService.deleteFunding({ token: queryToken, fundingId });
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
