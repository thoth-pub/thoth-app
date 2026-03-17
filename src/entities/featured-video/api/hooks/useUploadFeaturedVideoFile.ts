import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import { FeaturedVideoId } from '../../model/featured-video.types';

const { UPLOAD_FILE_FAILED } = NOTIFICATIONS;

const useUploadFeaturedVideoFile = (workId: string) => {
  const { featuredVideoService } = useServices();
  const queryClient = useQueryClient();
  const { sendErrorNotification } = useNotifications();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ featuredVideoId, file }: { featuredVideoId: FeaturedVideoId; file: File }) => {
      return featuredVideoService.uploadFile(featuredVideoId, file);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? UPLOAD_FILE_FAILED);
    },
  });

  const uploadFeaturedVideoFile = async (featuredVideoId: FeaturedVideoId, file: File): Promise<string> => {
    const url = await mutateAsync({ featuredVideoId, file });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });

    return url;
  };

  return { uploadFeaturedVideoFile, loading: isPending };
};

export default useUploadFeaturedVideoFile;
