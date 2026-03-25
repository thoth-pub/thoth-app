'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useUser } from '@/src/entities/user';
import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import { PublisherEntity, PublisherId } from '../../model/publisher.types';

const { PUBLISHER_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdatePublisher = (publisherId: PublisherId) => {
  const { publisherService } = useServices();
  const { user } = useUser();
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: PublisherEntity) => {
      return publisherService.updatePublisher(data, user.isSuperuser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.publisher, publisherId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? PUBLISHER_UPDATE_FAILED);
    },
  });

  return {
    updatePublisher: mutateAsync,
    loading: isPending,
  };
};

export default useUpdatePublisher;
