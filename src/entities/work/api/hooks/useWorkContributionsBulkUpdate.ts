import { ServerError } from '@apollo/client';

import { NOTIFICATIONS, QueryToken, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { UPDATE_CONTRIBUTION } from '../../model/work.mutations';
import type { WorkContribution, WorkId } from '../../model/work.types';
import { WorkDtoMapper } from '../../model/work.mapper';

const { WORK_CONTRIBUTION_UPDATE_FAILED } = NOTIFICATIONS;

const mapper = new WorkDtoMapper();

const useWorkContributionsBulkUpdate = (queryToken: QueryToken) => {
  const { sendErrorNotification } = useNotifications();

  const [updateContribution, { client }] = useMutationWithAuth({
    queryToken,
    mutation: UPDATE_CONTRIBUTION,
    options: {
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, WORK_CONTRIBUTION_UPDATE_FAILED);

          sendErrorNotification(errorMessage);
          return;
        }

        sendErrorNotification(WORK_CONTRIBUTION_UPDATE_FAILED);
      },
    },
  });

  const updateContributions = async (contributions: { id: WorkId; contribution: WorkContribution }[]) => {
    const dto = contributions.map(({ id, contribution }) => ({
      workId: id,
      ...mapper.toDtoContribution(contribution),
    }));

    const promises = dto.map((dto) => updateContribution({ variables: { data: dto } }));

    await Promise.all(promises);

    await client.refetchQueries({ include: 'all' });
  };

  return {
    updateContributions,
  };
};

export default useWorkContributionsBulkUpdate;
