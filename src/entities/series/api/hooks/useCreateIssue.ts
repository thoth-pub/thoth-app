'use client';

import { ServerError } from '@apollo/client';

import { CreateAffiliationMutation } from '@/gql/graphql';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, type QueryToken, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { CREATE_ISSUE } from '../../model/series.schema';
import type { SeriesId } from '../../model/series.types';

const { ISSUE_CREATION_FAILED } = NOTIFICATIONS;

type UseCreateIssueProps = {
  queryToken: QueryToken;
};

const useCreateIssue = ({ queryToken }: UseCreateIssueProps) => {
  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading, client }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: CREATE_ISSUE,
    options: {
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, ISSUE_CREATION_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(ISSUE_CREATION_FAILED);
      },
    },
  });

  const createIssue = async (data: { orderNumber: number; seriesId: SeriesId; workId: WorkId }) => {
    const { orderNumber, seriesId, workId } = data;

    mutate({
      variables: { data: { issueOrdinal: orderNumber, seriesId, workId } },
    });

    await client.refetchQueries({ include: 'active' });
  };

  return {
    createIssue,
    loading,
  };
};

export default useCreateIssue;
