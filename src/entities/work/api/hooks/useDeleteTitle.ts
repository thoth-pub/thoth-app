'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QueryKeys, useServices } from '@/src/shared';
import { useQueryToken } from '@/src/shared/hooks';

import type { WorkId } from '../../model/work.types';

const useDeleteTitle = (workId: WorkId) => {
  const { workService } = useServices();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (titleId: string) => {
      return workService.deleteTitle(queryToken, titleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workTranslations, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.translatedWorks, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workEditions, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workPrevEditions, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.works] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.books] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.forthcomingBooksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.publishedBooksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.serieses] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.series] });
    },
  });

  return { deleteTitle: mutateAsync, loading: isPending };
};

export default useDeleteTitle;
