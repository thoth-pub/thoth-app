'use client';

import { ServerError } from '@apollo/client';

import { CreateAffiliationMutation } from '@/gql/graphql';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, type QueryToken, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { UPDATE_ISSUE } from '../../model/series.schema';
import type { SeriesId } from '../../model/series.types';

const { ISSUE_UPDATE_FAILED } = NOTIFICATIONS;

type UseUpdateIssueProps = {
  queryToken: QueryToken;
};

const useUpdateIssue = (props: UseUpdateIssueProps) => {
  const { queryToken } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading, client }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: UPDATE_ISSUE,
    options: {
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, ISSUE_UPDATE_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(ISSUE_UPDATE_FAILED);
      },
    },
  });

  const updateIssue = async (data: { issueId: string; orderNumber: number; seriesId: SeriesId; workId: WorkId }) => {
    const { issueId, orderNumber, seriesId, workId } = data;

    mutate({
      variables: { data: { issueId, issueOrdinal: orderNumber, seriesId, workId } },
    });

    await client.refetchQueries({ include: 'all' });
  };

  return {
    updateIssue,
    loading,
  };
};

export default useUpdateIssue;
