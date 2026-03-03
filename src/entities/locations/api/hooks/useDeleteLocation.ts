import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import { type BaseEditSectionProps } from '@/src/shared/types';

const { LOCATION_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteLocation = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { locationService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (locationId: string) => {
      return locationService.deleteLocation(locationId);
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
