import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

import { WorkContribution } from '../../model/contribution.types';

export const useCreateContribution = () => {
  const queryClient = useQueryClient();
  const { contributionService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data, relatedWorkId }: { data: WorkContribution; relatedWorkId: string }) => {
      return contributionService.createContribution(data, relatedWorkId);
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
