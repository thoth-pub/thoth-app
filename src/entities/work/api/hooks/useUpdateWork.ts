import { ServerError } from '@apollo/client';

import { WorkStatus } from '@/gql/graphql';
import { GET_BOOKS, GET_BOOKS_COUNT } from '@/src/entities/book/model/book.schema';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { BaseEditSectionProps, NOTIFICATIONS, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { GET_WORK, GET_WORKS, GET_WORKS_COUNT, UPDATE_WORK } from '../../model/work.schema';

const { WORK_UPDATE_FAILED } = NOTIFICATIONS;

export const useUpdateWork = ({ workId, queryToken }: BaseEditSectionProps) => {
  const { sendErrorNotification } = useNotifications();
  const { activePublisher } = usePublisherStateMachine();

  const [mutate, { loading }] = useMutationWithAuth({
    queryToken,
    mutation: UPDATE_WORK,
    options: {
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, WORK_UPDATE_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(WORK_UPDATE_FAILED);
      },
      refetchQueries: [
        { query: GET_WORK, variables: { workId } },
        { query: GET_WORKS },
        { query: GET_WORKS_COUNT },
        { query: GET_BOOKS },
        { query: GET_BOOKS_COUNT, variables: { publishers: [activePublisher], workStatus: WorkStatus.Active } },
        { query: GET_BOOKS_COUNT, variables: { publishers: [activePublisher], workStatus: WorkStatus.Forthcoming } },
        { query: GET_BOOKS_COUNT },
      ],
    },
  });
  return {
    updateWork: mutate,
    loading,
  };
};
