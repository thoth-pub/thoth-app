import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, useServices, type QueryToken } from '@/src/shared';

type UseDeleteContributionProps = {
  queryToken: QueryToken;
};

export const useDeleteContribution = (props: UseDeleteContributionProps) => {
  const { queryToken } = props;

  const queryClient = useQueryClient();
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
