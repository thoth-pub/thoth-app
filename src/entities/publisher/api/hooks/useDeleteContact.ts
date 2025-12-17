import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared';
import { useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import type { ContactId, PublisherId } from '../../model/publisher.types';

const { PUBLISHER_CONTACT_DELETION_FAILED } = NOTIFICATIONS;

const useDeleteContact = (publisherId: PublisherId) => {
  const { publisherService } = useServices();
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (contactId: ContactId) => {
      return publisherService.deleteContact(queryToken, contactId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.publisher, publisherId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? PUBLISHER_CONTACT_DELETION_FAILED);
    },
  });

  return {
    deleteContact: mutateAsync,
    loading: isPending,
  };
};

export default useDeleteContact;
