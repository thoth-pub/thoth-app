import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PublicationId } from '@/src/entities/publication/model/publication.types';
import { BaseEditSectionProps, NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import { LocationEntity } from '../../model/location.types';

const { LOCATION_CREATE_FAILED } = NOTIFICATIONS;

const useCreateLocation = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { locationService } = useServices();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();

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
