import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context/servicesContext';
import { useNotifications } from '@/src/shared/hooks';

import type { WorkId } from '../../model/work.types';

const { WORK_COVER_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateWorkFrontCover = (workId: WorkId) => {
  const { sendErrorNotification } = useNotifications();
  const { fileStorage } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (file: File) => {
      return fileStorage.uploadWorkCover(workId, file);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? WORK_COVER_UPDATE_FAILED);
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
