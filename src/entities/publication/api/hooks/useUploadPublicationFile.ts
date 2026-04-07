import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications, usePreventInteraction, usePreventNavigation, useProgress } from '@/src/shared/hooks';

import { PublicationId } from '../../model/publication.types';

const { UPLOAD_FILE_FAILED } = NOTIFICATIONS;

const useUploadPublicationFile = (workId: string) => {
  const { publicationService } = useServices();
  const queryClient = useQueryClient();
  const { sendErrorNotification } = useNotifications();
  const { progress, setProgress, startProgress, resetProgress } = useProgress();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ publicationId, file }: { publicationId: PublicationId; file: File }) => {
      startProgress();
      return publicationService.uploadPublicationFile(publicationId, file, setProgress);
    },
    onSettled: resetProgress,
    onError: (error) => {
      sendErrorNotification(error?.message ?? UPLOAD_FILE_FAILED);
    },
  });

  usePreventNavigation(isPending);
  usePreventInteraction(isPending);

  const uploadPublicationFile = async (publicationId: PublicationId, file: File): Promise<string> => {
    const url = await mutateAsync({ publicationId, file });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });

    return url;
  };

  return { uploadPublicationFile, loading: isPending, progress };
};

export default useUploadPublicationFile;
