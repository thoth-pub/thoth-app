import { NOTIFICATIONS, type QueryToken } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { CREATE_CONTRIBUTION } from '../../model/work.mutations';
import { GET_WORK } from '../../model/work.schema';
import type { WorkId } from '../../model/work.types';

const { WORK_CONTRIBUTION_CREATION_FAILED } = NOTIFICATIONS;

type UseCreateWorkContributionProps = {
  workId: WorkId;
  queryToken: QueryToken;
};

export const useCreateWorkContribution = ({ workId, queryToken }: UseCreateWorkContributionProps) => {
  const { sendErrorNotification } = useNotifications();
  const [mutate, { loading }] = useMutationWithAuth({
    queryToken,
    mutation: CREATE_CONTRIBUTION,
    options: {
      onError: () => {
        sendErrorNotification(WORK_CONTRIBUTION_CREATION_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });
  return {
    createContribution: mutate,
    loading,
  };
};
