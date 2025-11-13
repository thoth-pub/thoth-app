import { ServerError } from '@apollo/client';

import { UpdateLocationMutation } from '@/gql/graphql';
import { PublicationId } from '@/src/entities/publication/model/publication.types';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { BaseEditSectionProps, NOTIFICATIONS, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { LocationDtoMapper } from '../../model/location.mapper';
import { UPDATE_LOCATION } from '../../model/location.schema';
import { LocationEntity } from '../../model/location.types';

const { LOCATION_UPDATE_FAILED } = NOTIFICATIONS;

const mapper = new LocationDtoMapper();

const useUpdateLocation = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate] = useMutationWithAuth<UpdateLocationMutation>({
    queryToken,
    mutation: UPDATE_LOCATION,
    options: {
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, LOCATION_UPDATE_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(LOCATION_UPDATE_FAILED);
      },
      refetchQueries: workId && workId.length > 0 ? [{ query: GET_WORK, variables: { workId } }] : [],
    },
  });

  const updateLocation = (data: LocationEntity & { publicationId: PublicationId }) => {
    const dto = mapper.toDto(data);

    mutate({ variables: { data: { ...dto, publicationId: data.publicationId } } });
  };

  return {
    updateLocation,
  };
};

export default useUpdateLocation;
