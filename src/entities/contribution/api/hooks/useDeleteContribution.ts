import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

export const useDeleteContribution = () => {
  const queryClient = useQueryClient();
  const { contributionService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (contributionId: string) => {
      return contributionService.deleteContribution(contributionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    },
  });

  return {
    deleteContribution: mutateAsync,
    loading: isPending,
  };
};
