import { BaseEditSectionProps, NOTIFICATIONS, QueryKeys } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LocationService } from '../location.service';

const { LOCATION_DELETE_FAILED } = NOTIFICATIONS;

const locationService = new LocationService();

const useDeleteLocation = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
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
