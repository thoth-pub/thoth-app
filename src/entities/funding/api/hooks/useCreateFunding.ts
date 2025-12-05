import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { FundingEntity } from '../../model/funding.types';
import { WorkId } from '@/src/entities/work/model/work.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const { FUNDING_CREATION_FAILED } = NOTIFICATIONS;

const useCreateFunding = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { fundingService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({
      data,
      relatedWorkId,
    }: {
      data: Omit<FundingEntity, 'id' | 'institutionName' | 'institutionRor'>;
      relatedWorkId: WorkId;
    }) => {
      return fundingService.createFunding({ token: queryToken, data, relatedWorkId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? FUNDING_CREATION_FAILED);
    },
  });

  const createFunding = async (
    data: Omit<FundingEntity, 'id' | 'institutionName' | 'institutionRor'>,
    relatedWorkId = workId,
  ) => {
    const funding = await mutateAsync({ data, relatedWorkId });

    return funding;
  };

  const createFundingForMultipleWorks = async (data: {
    relatedWorkIds: WorkId[];
    funding: Omit<FundingEntity, 'id' | 'institutionName' | 'institutionRor'>;
  }) => {
    const { relatedWorkIds, funding } = data;

    const promises = relatedWorkIds.map((relatedWorkId) => createFunding(funding, relatedWorkId));

    const results = await Promise.all(promises);

    return results;
  };

  return {
    createFunding,
    createFundingForMultipleWorks,
    loading: isPending,
  };
};

export default useCreateFunding;
