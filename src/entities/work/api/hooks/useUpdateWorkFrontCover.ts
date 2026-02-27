import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QueryKeys } from '@/src/shared';
import { useServices } from '@/src/shared/context/servicesContext';

import type { WorkId } from '../../model/work.types';

const useUpdateWorkFrontCover = (workId: WorkId) => {
  const { fileStorage } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (file: File) => {
      return fileStorage.uploadWorkCover(workId, file);
    },
  });

  const updateWorkFrontCover = async (file: File) => {
    await mutateAsync(file);
    await queryClient.invalidateQueries({ queryKey: [QueryKeys.forthcomingBooksCount] });
    await queryClient.invalidateQueries({ queryKey: [QueryKeys.publishedBooksCount] });
    await queryClient.invalidateQueries({ queryKey: [QueryKeys.latestUpdatedBooks] });
    await queryClient.invalidateQueries({ queryKey: [QueryKeys.latestPublishedBooks] });
    await queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
  };

  return {
    updateWorkFrontCover,
    loading: isPending,
  };
};

export default useUpdateWorkFrontCover;
