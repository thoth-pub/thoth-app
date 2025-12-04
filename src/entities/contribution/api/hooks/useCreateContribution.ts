import { QueryKeys, QueryToken } from '@/src/shared';
import { ContributionService } from '../contribution.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { WorkContribution } from '../../model/contribution.types';

type UseCreateContributionProps = {
  queryToken: QueryToken;
  onCompleted?: (data: WorkContribution) => void;
};

const contributionService = new ContributionService();

export const useCreateContribution = (props: UseCreateContributionProps) => {
  const { queryToken, onCompleted } = props;

  const queryClient = useQueryClient();

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
