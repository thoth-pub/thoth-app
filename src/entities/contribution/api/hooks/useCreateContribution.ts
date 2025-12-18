import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QueryKeys, useServices } from '@/src/shared';
import { useQueryToken } from '@/src/shared/hooks';

import { WorkContribution } from '../../model/contribution.types';

export const useCreateContribution = () => {
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();
  const { contributionService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data, relatedWorkId }: { data: WorkContribution; relatedWorkId: string }) => {
      return contributionService.createContribution(queryToken, data, relatedWorkId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    },
  });

  return {
    createContribution: mutateAsync,
    loading: isPending,
  };
};
