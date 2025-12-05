import { BaseEditSectionProps, NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { useMutation, useQueryClient } from '@tanstack/react-query';

const { LOCATION_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteLocation = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { locationService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (locationId: string) => {
      return locationService.deleteLocation(queryToken, locationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? LOCATION_DELETE_FAILED);
    },
  });

  return {
    deleteLocation: mutateAsync,
    loading: isPending,
  };
};

export default useDeleteLocation;
