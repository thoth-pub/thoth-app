import { ServerError } from '@apollo/client';

import { BaseEditSectionProps, NOTIFICATIONS, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { GET_WORK, UPDATE_WORK } from '../../model/work.schema';

const { WORK_UPDATE_FAILED } = NOTIFICATIONS;

export const useUpdateWork = ({ workId, queryToken }: BaseEditSectionProps) => {
  const { sendErrorNotification } = useNotifications();
  const [mutate, { loading }] = useMutationWithAuth({
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
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });
  return {
    updateWork: mutate,
    loading,
  };
};
