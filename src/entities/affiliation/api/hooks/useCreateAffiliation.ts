import type { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, type QueryToken } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { CREATE_AFFILIATION } from '../../model/affiliation.schema';

const { AFFILIATION_CREATION_SUCCESS, AFFILIATION_CREATION_FAILED } = NOTIFICATIONS;

type UseCreateAffiliationProps = {
  queryToken: QueryToken;
  workId?: WorkId;
};

const useCreateAffiliation = (props: UseCreateAffiliationProps) => {
  const { queryToken, workId = '' } = props;

  const { sendSuccessNotification, sendErrorNotification } = useNotifications();
  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: CREATE_AFFILIATION,
    options: {
      onCompleted: () => {
        sendSuccessNotification(AFFILIATION_CREATION_SUCCESS);
      },
      onError: (error) => {
        console.error(error);
        sendErrorNotification(AFFILIATION_CREATION_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  return {
    createAffiliation: mutate,
    loading,
  };
};

export default useCreateAffiliation;
