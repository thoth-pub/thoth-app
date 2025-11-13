import { ServerError } from '@apollo/client';

import type { CreateLocationMutation } from '@/gql/graphql';
import type { PublicationId } from '@/src/entities/publication/model/publication.types';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { BaseEditSectionProps, NOTIFICATIONS, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { LocationDtoMapper } from '../../model/location.mapper';
import { CREATE_LOCATION } from '../../model/location.schema';
import { LocationEntity } from '../../model/location.types';

const { LOCATION_CREATE_FAILED } = NOTIFICATIONS;

const mapper = new LocationDtoMapper();

const useCreateLocation = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate] = useMutationWithAuth<CreateLocationMutation>({
    queryToken,
    mutation: CREATE_LOCATION,
    options: {
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, LOCATION_CREATE_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(LOCATION_CREATE_FAILED);
      },
      refetchQueries: workId && workId.length > 0 ? [{ query: GET_WORK, variables: { workId } }] : [],
    },
  });

  const createLocation = (data: Omit<LocationEntity, 'id'> & { publicationId: PublicationId }) => {
    const { locationId, ...dto } = mapper.toDto({ ...data, id: '' });

    mutate({
      variables: { data: { ...dto, publicationId: data.publicationId } },
    });
  };

  return {
    createLocation,
  };
};

export default useCreateLocation;
