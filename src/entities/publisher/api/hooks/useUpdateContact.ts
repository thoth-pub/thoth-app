'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import type { ContactEntity, PublisherId } from '../../model/publisher.types';

const { PUBLISHER_CONTACT_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateContact = (publisherId: PublisherId) => {
  const { publisherService } = useServices();
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data, publisherId }: { data: ContactEntity; publisherId: PublisherId }) => {
      return publisherService.updateContact(data, publisherId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.publisher, publisherId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? PUBLISHER_CONTACT_UPDATE_FAILED);
    },
  });

  return {
    updateContact: mutateAsync,
    loading: isPending,
  };
};

export default useUpdateContact;
