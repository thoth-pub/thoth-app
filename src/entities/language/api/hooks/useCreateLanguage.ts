import type { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, type QueryToken } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { CREATE_LANGUAGE } from '../../model/language.schema';

const { LANGUAGE_CREATION_FAILED } = NOTIFICATIONS;

type UseCreateLanguageProps = {
  queryToken: QueryToken;
  workId: WorkId;
};

const useCreateLanguage = (props: UseCreateLanguageProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: CREATE_LANGUAGE,
    options: {
      onError: (error) => {
        console.error(error);
        sendErrorNotification(LANGUAGE_CREATION_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  return {
    createLanguage: mutate,
    loading,
  };
};

export default useCreateLanguage;
