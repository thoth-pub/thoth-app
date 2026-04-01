import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import { AdditionalResourceId } from '../../model/additional-resource.types';

const { UPLOAD_FILE_FAILED } = NOTIFICATIONS;

const useUploadAdditionalResourceFile = (workId: string) => {
  const { additionalResourceService } = useServices();
  const queryClient = useQueryClient();
  const { sendErrorNotification } = useNotifications();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ additionalResourceId, file }: { additionalResourceId: AdditionalResourceId; file: File }) => {
      return additionalResourceService.uploadFile(additionalResourceId, file);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? UPLOAD_FILE_FAILED);
    },
  });

  const uploadAdditionalResourceFile = async (additionalResourceId: AdditionalResourceId, file: File): Promise<string> => {
    const url = await mutateAsync({ additionalResourceId, file });
    await queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });

    return url;
  };

  return { uploadAdditionalResourceFile, loading: isPending };
};

export default useUploadAdditionalResourceFile;
