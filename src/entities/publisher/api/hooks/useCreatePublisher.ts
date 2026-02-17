import { useMutation } from '@tanstack/react-query';

import { NOTIFICATIONS, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

const { PUBLISHER_CREATION_FAILED } = NOTIFICATIONS;

const useCreatePublisher = () => {
  const { publisherService } = useServices();
  const { sendErrorNotification } = useNotifications();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (publisherName: string) => {
      return publisherService.createPublisher(publisherName);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? PUBLISHER_CREATION_FAILED);
    },
  });

  return {
    createPublisher: mutateAsync,
    loading: isPending,
  };
};

export default useCreatePublisher;
