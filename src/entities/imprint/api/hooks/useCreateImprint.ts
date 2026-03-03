import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PublisherId } from '@/src/entities/publisher';
import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

const { IMPRINT_CREATION_FAILED } = NOTIFICATIONS;

const useCreateImprint = () => {
  const { imprintService } = useServices();
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: { publisherId: PublisherId; imprintName: string }) => {
      return imprintService.createImprint(data);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? IMPRINT_CREATION_FAILED);
    },
  });

  const createImprint = async ({ publisherId, imprintName }: { publisherId: PublisherId; imprintName: string }) => {
    await mutateAsync({ publisherId, imprintName });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.publisherImprints, publisherId] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.userInfo] });
  };

  return {
    createImprint,
    loading: isPending,
  };
};

export default useCreateImprint;
