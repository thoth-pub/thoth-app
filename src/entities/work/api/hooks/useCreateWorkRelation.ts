import { ServerError } from '@apollo/client';

import { type CreateWorkMutation } from '@/gql/graphql';
import { NOTIFICATIONS, type QueryToken, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { CREATE_WORK_RELATION, GET_WORK, GET_WORK_CHAPTERS } from '../../model/work.schema';

type UseCreateWorkRelationProps = {
  queryToken: QueryToken;
};

const { CHAPTER_CREATION_SUCCESS, CHAPTER_CREATION_FAILED } = NOTIFICATIONS;

const useCreateWorkRelation = (props: UseCreateWorkRelationProps) => {
  const { queryToken } = props;

  const { sendErrorNotification, sendSuccessNotification } = useNotifications();

  const [mutate, { loading, client }] = useMutationWithAuth<CreateWorkMutation>({
    queryToken,
    mutation: CREATE_WORK_RELATION,
    options: {
      onCompleted: async () => {
        sendSuccessNotification(CHAPTER_CREATION_SUCCESS);
        await client.refetchQueries({ include: [GET_WORK, GET_WORK_CHAPTERS] });
      },
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, CHAPTER_CREATION_FAILED);

          sendErrorNotification(errorMessage);
          return;
        }

        sendErrorNotification(CHAPTER_CREATION_FAILED);
      },
    },
  });

  return {
    createWorkRelation: mutate,
    loading,
  };
};

export default useCreateWorkRelation;
