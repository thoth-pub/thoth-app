import { useMutation } from '@tanstack/react-query';

import { PublisherId } from '@/src/entities/publisher';
import { NOTIFICATIONS } from '@/src/shared';
import { useServices } from '@/src/shared/context';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

const { IMPRINT_CREATION_FAILED } = NOTIFICATIONS;

const useCreateImprint = () => {
  const { imprintService } = useServices();
  const { sendErrorNotification } = useNotifications();
  const queryToken = useQueryToken();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: { publisherId: PublisherId; imprintName: string }) => {
      return imprintService.createImprint(queryToken, data);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? IMPRINT_CREATION_FAILED);
    },
  });

  return {
    createImprint: mutateAsync,
    loading: isPending,
  };
};

export default useCreateImprint;
