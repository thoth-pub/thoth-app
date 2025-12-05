'use client';

import { QueryKeys, QueryToken, useServices } from '@/src/shared';
import { WorkContribution } from '../../model/contribution.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type UseUpdateContributionProps = {
  queryToken: QueryToken;
  relatedWorkId: string;
};

export const useUpdateContribution = (props: UseUpdateContributionProps & { relatedWorkId: string }) => {
  const { queryToken, relatedWorkId } = props;

  const queryClient = useQueryClient();
  const { contributionService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: WorkContribution) => {
      return contributionService.updateContribution(queryToken, data, relatedWorkId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    },
  });

  return {
    updateContribution: mutateAsync,
    loading: isPending,
  };
};
