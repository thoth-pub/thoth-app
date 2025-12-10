'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QueryKeys, useServices } from '@/src/shared';
import { useQueryToken } from '@/src/shared/hooks';

import { WorkContribution } from '../../model/contribution.types';

type UseUpdateContributionProps = {
  relatedWorkId: string;
};

export const useUpdateContribution = (props: UseUpdateContributionProps & { relatedWorkId: string }) => {
  const { relatedWorkId } = props;

  const queryClient = useQueryClient();
  const queryToken = useQueryToken();
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
