'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, useServices } from '@/src/shared';
import { QueryKeys } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import { PublisherEntity, PublisherId } from '../../model/publisher.types';

const { PUBLISHER_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdatePublisher = (publisherId: PublisherId) => {
  const { publisherService } = useServices();
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: PublisherEntity) => {
      return publisherService.updatePublisher(queryToken, data);
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
