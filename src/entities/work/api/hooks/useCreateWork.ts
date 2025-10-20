import { ServerError } from '@apollo/client';

import type { CreateWorkMutation } from '@/gql/graphql';
import { NOTIFICATIONS, type QueryToken, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { CREATE_WORK } from '../../model/work.mutations';

type UseCreateWorkProps = {
  queryToken: QueryToken;
  onCompleted: (data: CreateWorkMutation) => void;
};

const { WORK_CREATION_SUCCESS, WORK_CREATION_FAILED } = NOTIFICATIONS;

const useCreateWork = (props: UseCreateWorkProps) => {
  const { queryToken, onCompleted } = props;

  const { sendErrorNotification, sendSuccessNotification } = useNotifications();

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
    },
  });

  return {
    createWork: mutate,
    loading,
  };
};

export default useCreateWork;
