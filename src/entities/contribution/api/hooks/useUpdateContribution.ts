'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

import { WorkContribution } from '../../model/contribution.types';

type UseUpdateContributionProps = {
  relatedWorkId: string;
};

export const useUpdateContribution = (props: UseUpdateContributionProps & { relatedWorkId: string }) => {
  const { relatedWorkId } = props;

  const queryClient = useQueryClient();
  const { contributionService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: WorkContribution) => {
      return contributionService.updateContribution(data, relatedWorkId);
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
