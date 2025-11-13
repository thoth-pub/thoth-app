import { ServerError } from '@apollo/client';

import { type CreateContributionMutation } from '@/gql/graphql';
import { type BaseEditSectionProps, NOTIFICATIONS, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { CREATE_CONTRIBUTION, DELETE_CONTRIBUTION, UPDATE_CONTRIBUTION } from '../../model/work.mutations';
import type { WorkContributionDto } from '../../model/work.types';

const { WORK_CONTRIBUTION_CREATION_FAILED, WORK_CONTRIBUTION_DELETION_FAILED, WORK_CONTRIBUTION_UPDATE_FAILED } =
  NOTIFICATIONS;

type UseCWorkContributionProps = Omit<BaseEditSectionProps, 'workId'> & {
  onCreateComplete?: (data: WorkContributionDto) => void;
};

export const useWorkContribution = ({ queryToken, onCreateComplete }: UseCWorkContributionProps) => {
  const { sendErrorNotification } = useNotifications();

  const [createContribution, { loading, client }] = useMutationWithAuth({
    queryToken,
    mutation: CREATE_CONTRIBUTION,
    options: {
      onCompleted: async (data: CreateContributionMutation) => {
        onCreateComplete?.(data.createContribution as WorkContributionDto);
        await client.refetchQueries({ include: 'active' });
      },
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, WORK_CONTRIBUTION_CREATION_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(WORK_CONTRIBUTION_CREATION_FAILED);
      },
    },
  });

  const [deleteContribution, { loading: deleteContributionLoading }] = useMutationWithAuth({
    queryToken,
    mutation: DELETE_CONTRIBUTION,
    options: {
      onCompleted: async () => {
        await client.refetchQueries({ include: 'active' });
      },
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

  const [updateContribution, { loading: updateContributionLoading }] = useMutationWithAuth({
    queryToken,
    mutation: UPDATE_CONTRIBUTION,
    options: {
      onCompleted: async () => {
        await client.refetchQueries({ include: 'active' });
      },
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

  return {
    createContribution,
    deleteContribution,
    updateContribution,
    loading: loading || deleteContributionLoading || updateContributionLoading,
  };
};
