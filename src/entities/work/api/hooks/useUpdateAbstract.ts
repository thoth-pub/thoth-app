'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type AbstractEntity, QueryKeys, useServices } from '@/src/shared';
import { useQueryToken } from '@/src/shared/hooks';

import type { WorkId } from '../../model/work.types';

const useUpdateAbstract = (workId: WorkId) => {
  const { workService } = useServices();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data }: { data: AbstractEntity }) => {
      return workService.updateAbstract(queryToken, data, workId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
  });

  return { updateAbstract: mutateAsync, loading: isPending };
};

export default useUpdateAbstract;
