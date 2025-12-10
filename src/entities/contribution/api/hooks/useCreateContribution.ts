import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QueryKeys, useServices } from '@/src/shared';
import { useQueryToken } from '@/src/shared/hooks';

import { WorkContribution } from '../../model/contribution.types';

type UseCreateContributionProps = {
  onCompleted?: (data: WorkContribution) => void;
};

export const useCreateContribution = (props: UseCreateContributionProps) => {
  const { onCompleted } = props;

  const queryClient = useQueryClient();
  const queryToken = useQueryToken();
  const { contributionService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data, relatedWorkId }: { data: WorkContribution; relatedWorkId: string }) => {
      return contributionService.createContribution(queryToken, data, relatedWorkId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
      onCompleted?.(data);
    },
  });

  return {
    createContribution: mutateAsync,
    loading: isPending,
  };
};
