import { ServerError } from '@apollo/client';

import { BaseEditSectionProps, NOTIFICATIONS, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { GET_WORK_CHAPTERS, UPDATE_WORK } from '../../model/work.schema';
import { WorkEntity } from '../../model/work.types';
import { WorkDtoMapper } from '../../model/work.mapper';

const { WORK_UPDATE_FAILED } = NOTIFICATIONS;

const mapper = new WorkDtoMapper();

export const useUpdateWork = ({ queryToken }: BaseEditSectionProps) => {
  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading, client }] = useMutationWithAuth({
    queryToken,
    mutation: UPDATE_WORK,
    options: {
      onCompleted: () => {
        client.refetchQueries({ include: 'active' });
      },
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, WORK_UPDATE_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(WORK_UPDATE_FAILED);
      },
      refetchQueries: [GET_WORK_CHAPTERS],
    },
  });

  const updateWork = async (data: WorkEntity) => {
    const dto = mapper.toDto(data);

    await mutate({ variables: { data: dto } });
  };

  return {
    updateWork,
    loading,
  };
};
