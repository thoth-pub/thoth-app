import { ServerError } from '@apollo/client';

import { NOTIFICATIONS, QueryToken, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { DELETE_CONTRIBUTION } from '../../model/work.mutations';
import { ContributionId } from '@/src/entities/contributor/model/contributor.types';

const { WORK_CONTRIBUTION_DELETION_FAILED } = NOTIFICATIONS;

const useWorkContributionsBulkDelete = (queryToken: QueryToken) => {
  const { sendErrorNotification } = useNotifications();

  const [deleteContribution] = useMutationWithAuth({
    queryToken,
    mutation: DELETE_CONTRIBUTION,
    options: {
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, WORK_CONTRIBUTION_DELETION_FAILED);

          sendErrorNotification(errorMessage);
          return;
        }

        sendErrorNotification(WORK_CONTRIBUTION_DELETION_FAILED);
      },
    },
  });

  const deleteContributions = async (contributionIds: ContributionId[]) => {
    const promises = contributionIds.map((contributionId) => deleteContribution({ variables: { contributionId } }));

    await Promise.all(promises);
  };

  return {
    deleteContributions,
  };
};

export default useWorkContributionsBulkDelete;
