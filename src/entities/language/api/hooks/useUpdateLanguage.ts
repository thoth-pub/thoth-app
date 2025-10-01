import type { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, type QueryToken } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { UPDATE_LANGUAGE } from '../../model/language.schema';

type UseCreateLanguageProps = {
  queryToken: QueryToken;
  workId?: WorkId;
};

const { LANGUAGE_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateLanguage = (props: UseCreateLanguageProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: UPDATE_LANGUAGE,
    options: {
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
      onError: () => {
        sendErrorNotification(LANGUAGE_UPDATE_FAILED);
      },
    },
  });

  return {
    updateLanguage: mutate,
    loading,
  };
};

export default useUpdateLanguage;
