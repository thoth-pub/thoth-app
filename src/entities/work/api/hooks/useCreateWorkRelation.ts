import { ServerError } from '@apollo/client';

import { type CreateWorkMutation } from '@/gql/graphql';
import { type BaseEditSectionProps, NOTIFICATIONS, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { CREATE_WORK_RELATION, GET_WORK, GET_WORK_CHAPTERS } from '../../model/work.schema';

type UseCreateWorkRelationProps = BaseEditSectionProps;

const { CHAPTER_CREATION_SUCCESS, CHAPTER_CREATION_FAILED } = NOTIFICATIONS;

const useCreateWorkRelation = (props: UseCreateWorkRelationProps) => {
  const { queryToken, workId } = props;

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
      refetchQueries: [
        { query: GET_WORK_CHAPTERS, variables: { workId } },
        { query: GET_WORK, variables: { workId } },
      ],
    },
  });

  return {
    createWorkRelation: mutate,
    loading,
  };
};

export default useCreateWorkRelation;
