import { useMutation, useQueryClient } from '@tanstack/react-query';

import { MarkdownFormat, QueryKeys, useServices } from '@/src/shared';
import { useQueryToken } from '@/src/shared/hooks';

import { WorkContribution } from '../../model/contribution.types';

export const useCreateContribution = () => {
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();
  const { contributionService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({
      data,
      relatedWorkId,
      markupFormat,
    }: {
      data: WorkContribution;
      relatedWorkId: string;
      markupFormat: MarkdownFormat;
    }) => {
      return contributionService.createContribution(queryToken, data, relatedWorkId, markupFormat);
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
