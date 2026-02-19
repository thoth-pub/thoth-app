import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { PublicationId } from '../../model/publication.types';

const { UPLOAD_FILE_FAILED } = NOTIFICATIONS;

const useUploadPublicationFile = (workId: string) => {
  const { publicationService } = useServices();
  const queryClient = useQueryClient();
  const { sendErrorNotification } = useNotifications();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ publicationId, file }: { publicationId: PublicationId; file: File }) => {
      return publicationService.uploadPublicationFile(publicationId, file);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? UPLOAD_FILE_FAILED);
    },
  });

  const uploadPublicationFile = async (publicationId: PublicationId, file: File): Promise<string> => {
    const url = await mutateAsync({ publicationId, file });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });

    return url;
  };

  return { uploadPublicationFile, loading: isPending };
};

export default useUploadPublicationFile;
