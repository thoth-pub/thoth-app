import { ServerError } from '@apollo/client';

import { type CreateContributionMutation, Direction, Expression, WorkStatus } from '@/gql/graphql';
import { GET_BOOKS } from '@/src/entities/book/model/book.schema';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import {
  type BaseEditSectionProps,
  getSameDayAndMonthDateInPast,
  NOTIFICATIONS,
  serverErrorParser,
} from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { CREATE_CONTRIBUTION, DELETE_CONTRIBUTION, UPDATE_CONTRIBUTION } from '../../model/work.mutations';
import { GET_WORK } from '../../model/work.schema';
import type { WorkContributionDto } from '../../model/work.types';

const { WORK_CONTRIBUTION_CREATION_FAILED, WORK_CONTRIBUTION_DELETION_FAILED, WORK_CONTRIBUTION_UPDATE_FAILED } =
  NOTIFICATIONS;

type UseCWorkContributionProps = BaseEditSectionProps & {
  onCreateComplete?: (data: WorkContributionDto) => void;
};

export const useWorkContribution = ({ workId, queryToken, onCreateComplete }: UseCWorkContributionProps) => {
  const { activePublisher } = usePublisherStateMachine();
  const { sendErrorNotification } = useNotifications();
  const startDate = getSameDayAndMonthDateInPast(1);

  const [createContribution, { loading }] = useMutationWithAuth({
    queryToken,
    mutation: CREATE_CONTRIBUTION,
    options: {
      onCompleted: (data: CreateContributionMutation) => {
        onCreateComplete?.(data.createContribution);
      },
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, WORK_CONTRIBUTION_CREATION_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(WORK_CONTRIBUTION_CREATION_FAILED);
      },
      refetchQueries: [
        { query: GET_WORK, variables: { workId } },
        { query: GET_BOOKS, variables: { publishers: [activePublisher] } },
        {
          query: GET_BOOKS,
          variables: { publishers: [activePublisher], startedAt: startDate, expression: Expression.GreaterThan },
        },
        { query: GET_BOOKS, variables: { publishers: [activePublisher], limit: 3, direction: Direction.Desc } },
        {
          query: GET_BOOKS,
          variables: {
            publishers: [activePublisher],
            workStatus: WorkStatus.Active,
            limit: 3,
            direction: Direction.Desc,
          },
        },
      ],
    },
  });

  const [deleteContribution, { loading: deleteContributionLoading }] = useMutationWithAuth({
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
      refetchQueries: [
        { query: GET_WORK, variables: { workId } },
        { query: GET_BOOKS, variables: { publishers: [activePublisher] } },
        {
          query: GET_BOOKS,
          variables: { publishers: [activePublisher], startedAt: startDate, expression: Expression.GreaterThan },
        },
        { query: GET_BOOKS, variables: { publishers: [activePublisher], limit: 3, direction: Direction.Desc } },
        {
          query: GET_BOOKS,
          variables: {
            publishers: [activePublisher],
            workStatus: WorkStatus.Active,
            limit: 3,
            direction: Direction.Desc,
          },
        },
      ],
    },
  });

  const [updateContribution, { loading: updateContributionLoading }] = useMutationWithAuth({
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
      refetchQueries: [
        { query: GET_WORK, variables: { workId } },
        { query: GET_BOOKS, variables: { publishers: [activePublisher] } },
        {
          query: GET_BOOKS,
          variables: { publishers: [activePublisher], startedAt: startDate, expression: Expression.GreaterThan },
        },
        { query: GET_BOOKS, variables: { publishers: [activePublisher], limit: 3, direction: Direction.Desc } },
        {
          query: GET_BOOKS,
          variables: {
            publishers: [activePublisher],
            workStatus: WorkStatus.Active,
            limit: 3,
            direction: Direction.Desc,
          },
        },
      ],
    },
  });

  return {
    createContribution,
    deleteContribution,
    updateContribution,
    loading: loading || deleteContributionLoading || updateContributionLoading,
  };
};
