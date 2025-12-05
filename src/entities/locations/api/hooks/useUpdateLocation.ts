import { PublicationId } from '@/src/entities/publication/model/publication.types';
import { BaseEditSectionProps, NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { LocationEntity } from '../../model/location.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const { LOCATION_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateLocation = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { locationService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: LocationEntity & { publicationId: PublicationId }) => {
      return locationService.updateLocation(queryToken, data, data.publicationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? LOCATION_UPDATE_FAILED);
    },
  });

  return {
    updateLocation: mutateAsync,
    loading: isPending,
  };
};

export default useUpdateLocation;
