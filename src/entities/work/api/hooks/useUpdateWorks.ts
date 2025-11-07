import { ServerError } from '@apollo/client';

import { NOTIFICATIONS, QueryToken, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { UPDATE_WORK } from '../../model/work.schema';
import { WorkEntity } from '../../model/work.types';
import { WorkDtoMapper } from '../../model/work.mapper';

const { WORK_UPDATE_FAILED } = NOTIFICATIONS;

const mapper = new WorkDtoMapper();

const useUpdateWorks = (queryToken: QueryToken) => {
  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading, client }] = useMutationWithAuth({
    queryToken,
    mutation: UPDATE_WORK,
    options: {
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, WORK_UPDATE_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(WORK_UPDATE_FAILED);
      },
    },
  });

  const updateWorks = async (data: WorkEntity[]) => {
    const dto = data.map(mapper.toDto);

    await Promise.all(dto.map((dto) => mutate({ variables: { data: dto } })));

    await client.refetchQueries({ include: 'active' });
  };

  return {
    updateWorks,
    loading,
  };
};

export default useUpdateWorks;
