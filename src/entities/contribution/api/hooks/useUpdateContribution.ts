'use client';

import { QueryKeys, QueryToken } from '@/src/shared';
import { WorkContribution } from '../../model/contribution.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ContributionService } from '../contribution.service';

type UseUpdateContributionProps = {
  queryToken: QueryToken;
  relatedWorkId: string;
};

const contributionService = new ContributionService();

export const useUpdateContribution = (props: UseUpdateContributionProps & { relatedWorkId: string }) => {
  const { queryToken, relatedWorkId } = props;

  const queryClient = useQueryClient();

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
