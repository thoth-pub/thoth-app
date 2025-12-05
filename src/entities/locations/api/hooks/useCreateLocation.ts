import type { PublicationId } from '@/src/entities/publication/model/publication.types';
import { BaseEditSectionProps, NOTIFICATIONS, QueryKeys } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { LocationEntity } from '../../model/location.types';
import { LocationService } from '../location.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const { LOCATION_CREATE_FAILED } = NOTIFICATIONS;

const locationService = new LocationService();

const useCreateLocation = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: LocationEntity & { publicationId: PublicationId }) => {
      return locationService.createLocation(queryToken, data, data.publicationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? LOCATION_CREATE_FAILED);
    },
  });

  return {
    createLocation: mutateAsync,
    loading: isPending,
  };
};

export default useCreateLocation;
