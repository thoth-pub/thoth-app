import { useMutation } from '@tanstack/react-query';

import { NOTIFICATIONS } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

const { AFFILIATION_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteAffiliation = () => {
  const { sendErrorNotification } = useNotifications();
  const { affiliationService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (affiliationId: string) => {
      return affiliationService.deleteAffiliation(affiliationId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? AFFILIATION_DELETE_FAILED);
    },
  });

  return {
    deleteAffiliation: mutateAsync,
    loading: isPending,
  };
};

export default useDeleteAffiliation;
