import type { DeleteLocationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { BaseEditSectionProps, NOTIFICATIONS } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { DELETE_LOCATION } from '../../model/location.schema';

const { LOCATION_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteLocation = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate] = useMutationWithAuth<DeleteLocationMutation>({
    queryToken,
    mutation: DELETE_LOCATION,
    options: {
      onError: (error) => {
        console.error(error);
        sendErrorNotification(LOCATION_DELETE_FAILED);
      },
      refetchQueries: workId && workId.length > 0 ? [{ query: GET_WORK, variables: { workId } }] : [],
    },
  });

  const deleteLocation = (locationId: string) => {
    mutate({
      variables: { locationId },
    });
  };

  return {
    deleteLocation,
  };
};

export default useDeleteLocation;
