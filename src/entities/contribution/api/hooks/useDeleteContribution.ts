import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QueryKeys, useServices } from '@/src/shared';
import { useQueryToken } from '@/src/shared/hooks';

export const useDeleteContribution = () => {
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();
  const { contributionService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (contributionId: string) => {
      return contributionService.deleteContribution(queryToken, contributionId);
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
