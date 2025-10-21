import { ServerError } from '@apollo/client';

import { type CreateWorkMutation,WorkStatus } from '@/gql/graphql';
import { GET_BOOKS, GET_BOOKS_COUNT } from '@/src/entities/book/model/book.schema';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { NOTIFICATIONS, type QueryToken, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { CREATE_WORK } from '../../model/work.mutations';
import { GET_WORKS, GET_WORKS_COUNT } from '../../model/work.schema';

type UseCreateWorkProps = {
  queryToken: QueryToken;
  onCompleted: (data: CreateWorkMutation) => void;
};

const { WORK_CREATION_SUCCESS, WORK_CREATION_FAILED } = NOTIFICATIONS;

const useCreateWork = (props: UseCreateWorkProps) => {
  const { queryToken, onCompleted } = props;

  const { sendErrorNotification, sendSuccessNotification } = useNotifications();
  const { activePublisher } = usePublisherStateMachine();

  const [mutate, { loading }] = useMutationWithAuth<CreateWorkMutation>({
    queryToken,
    mutation: CREATE_WORK,
    options: {
      onCompleted: (data) => {
        sendSuccessNotification(WORK_CREATION_SUCCESS);
        onCompleted(data);
      },
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, WORK_CREATION_FAILED);

          sendErrorNotification(errorMessage);
          return;
        }

        sendErrorNotification(WORK_CREATION_FAILED);
      },
      refetchQueries: [
        { query: GET_WORKS },
        { query: GET_WORKS_COUNT },
        { query: GET_BOOKS },
        { query: GET_BOOKS_COUNT },
        { query: GET_BOOKS_COUNT, variables: { publishers: [activePublisher], workStatus: WorkStatus.Active } },
        { query: GET_BOOKS_COUNT, variables: { publishers: [activePublisher], workStatus: WorkStatus.Forthcoming } },
      ],
    },
  });

  return {
    createWork: mutate,
    loading,
  };
};

export default useCreateWork;
