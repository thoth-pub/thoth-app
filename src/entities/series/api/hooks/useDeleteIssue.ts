import { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, type QueryToken } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { DELETE_ISSUE, GET_SERIES } from '../../model/series.schema';

const { ISSUE_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteIssue = ({ queryToken, workId }: { queryToken: QueryToken; workId: WorkId }) => {
  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: DELETE_ISSUE,
    options: {
      onError: (error) => {
        console.error(error);
        sendErrorNotification(ISSUE_DELETE_FAILED);
      },
      refetchQueries: [{ query: GET_SERIES }, { query: GET_WORK, variables: { workId } }],
    },
  });

  const deleteIssue = (issueId: string) => {
    mutate({
      variables: { issueId },
    });
  };

  return {
    deleteIssue,
    loading,
  };
};

export default useDeleteIssue;
