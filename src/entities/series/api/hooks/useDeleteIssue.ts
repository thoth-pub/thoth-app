'use client';

import { CreateAffiliationMutation } from '@/gql/graphql';
import { NOTIFICATIONS, type QueryToken } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { DELETE_ISSUE } from '../../model/series.schema';

const { ISSUE_DELETE_FAILED } = NOTIFICATIONS;

type UseDeleteIssueProps = {
  queryToken: QueryToken;
};

const useDeleteIssue = (props: UseDeleteIssueProps) => {
  const { queryToken } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading, client }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: DELETE_ISSUE,
    options: {
      onError: (error) => {
        console.error(error);
        sendErrorNotification(ISSUE_DELETE_FAILED);
      },
      onCompleted: async () => {
        await client.refetchQueries({ include: 'all' });
      },
    },
  });

  const deleteIssue = async (issueId: string) => {
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
