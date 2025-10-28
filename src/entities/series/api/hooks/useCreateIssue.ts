import { ServerError } from '@apollo/client';

import { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, type QueryToken, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { CREATE_ISSUE, GET_SERIES } from '../../model/series.schema';
import type { SeriesId } from '../../model/series.types';

const { ISSUE_CREATION_FAILED } = NOTIFICATIONS;

const useCreateIssue = ({ queryToken, workId }: { queryToken: QueryToken; workId: WorkId }) => {
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
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  const createIssue = (data: { orderNumber: number; seriesId: SeriesId; workId: WorkId }) => {
    const { orderNumber, seriesId, workId } = data;

    mutate({
      variables: { data: { issueOrdinal: orderNumber, seriesId, workId } },
    });
    client.refetchQueries({ include: [GET_SERIES] });
  };

  return {
    createIssue,
    loading,
  };
};

export default useCreateIssue;
