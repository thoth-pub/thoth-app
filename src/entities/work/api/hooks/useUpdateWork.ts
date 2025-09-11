import { NOTIFICATIONS, type QueryToken } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { GET_WORK, UPDATE_WORK } from '../../model/work.schema';
import type { WorkId } from '../../model/work.types';

const { WORK_UPDATE_FAILED } = NOTIFICATIONS;

type UseUpdateWorkProps = {
  workId: WorkId;
  queryToken: QueryToken;
};

export const useUpdateWork = ({ workId, queryToken }: UseUpdateWorkProps) => {
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
