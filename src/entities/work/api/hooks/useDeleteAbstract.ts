'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QueryKeys, useServices } from '@/src/shared';
import { useQueryToken } from '@/src/shared/hooks';

import type { WorkId } from '../../model/work.types';

const useDeleteAbstract = (workId: WorkId) => {
  const { workService } = useServices();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (abstractId: string) => {
      return workService.deleteAbstract(queryToken, abstractId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
  });

  return { deleteAbstract: mutateAsync, loading: isPending };
};

export default useDeleteAbstract;
