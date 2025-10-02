import { BaseEditSectionProps, NOTIFICATIONS } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { GET_WORK, UPDATE_WORK } from '../../model/work.schema';

const { WORK_UPDATE_FAILED } = NOTIFICATIONS;

export const useUpdateWork = ({ workId, queryToken }: BaseEditSectionProps) => {
  const { sendErrorNotification } = useNotifications();
  const [mutate, { loading }] = useMutationWithAuth({
    queryToken,
    mutation: UPDATE_WORK,
    options: {
      onError: () => {
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
