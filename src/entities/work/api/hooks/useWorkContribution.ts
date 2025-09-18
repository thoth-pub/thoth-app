import { NOTIFICATIONS, type QueryToken } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { CREATE_CONTRIBUTION, DELETE_CONTRIBUTION, UPDATE_CONTRIBUTION } from '../../model/work.mutations';
import { GET_WORK } from '../../model/work.schema';
import type { WorkId } from '../../model/work.types';

const { WORK_CONTRIBUTION_CREATION_FAILED, WORK_CONTRIBUTION_DELETION_FAILED, WORK_CONTRIBUTION_UPDATE_FAILED } =
  NOTIFICATIONS;

type UseCWorkContributionProps = {
  workId: WorkId;
  queryToken: QueryToken;
};

export const useWorkContribution = ({ workId, queryToken }: UseCWorkContributionProps) => {
  const { sendErrorNotification } = useNotifications();
  const [createContribution, { loading }] = useMutationWithAuth({
    queryToken,
    mutation: CREATE_CONTRIBUTION,
    options: {
      onError: () => {
        sendErrorNotification(WORK_CONTRIBUTION_CREATION_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  const [deleteContribution, { loading: deleteContributionLoading }] = useMutationWithAuth({
    queryToken,
    mutation: DELETE_CONTRIBUTION,
    options: {
      onError: () => {
        sendErrorNotification(WORK_CONTRIBUTION_DELETION_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  const [updateContribution, { loading: updateContributionLoading }] = useMutationWithAuth({
    queryToken,
    mutation: UPDATE_CONTRIBUTION,
    options: {
      onError: () => {
        sendErrorNotification(WORK_CONTRIBUTION_UPDATE_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  return {
    createContribution,
    deleteContribution,
    updateContribution,
    loading: loading || deleteContributionLoading || updateContributionLoading,
  };
};
