import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications, usePreventInteraction, usePreventNavigation, useProgress } from '@/src/shared/hooks';

import { FeaturedVideoId } from '../../model/featured-video.types';

const { UPLOAD_FILE_FAILED } = NOTIFICATIONS;

const useUploadFeaturedVideoFile = (workId: string) => {
  const { featuredVideoService } = useServices();
  const queryClient = useQueryClient();
  const { sendErrorNotification } = useNotifications();
  const { progress, setProgress, startProgress, resetProgress } = useProgress();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ featuredVideoId, file }: { featuredVideoId: FeaturedVideoId; file: File }) => {
      startProgress();
      return featuredVideoService.uploadFile(featuredVideoId, file, setProgress);
    },
    onSettled: resetProgress,
    onError: (error) => {
      sendErrorNotification(error?.message ?? UPLOAD_FILE_FAILED);
    },
  });

  usePreventNavigation(isPending);
  usePreventInteraction(isPending);

  const uploadFeaturedVideoFile = async (featuredVideoId: FeaturedVideoId, file: File): Promise<string> => {
    const url = await mutateAsync({ featuredVideoId, file });
    await queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });

    return url;
  };

  return { uploadFeaturedVideoFile, loading: isPending, progress };
};

export default useUploadFeaturedVideoFile;
