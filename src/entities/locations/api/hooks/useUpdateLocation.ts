import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PublicationId } from '@/src/entities/publication/model/publication.types';
import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import { type BaseEditSectionProps } from '@/src/shared/types';

import { LocationEntity } from '../../model/location.types';

const { LOCATION_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateLocation = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { locationService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: LocationEntity & { publicationId: PublicationId }) => {
      return locationService.updateLocation(data, data.publicationId);
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
