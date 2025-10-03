import type { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { type BaseEditSectionProps, NOTIFICATIONS } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { UPDATE_PUBLICATION } from '../../model/publication.schema';

const { PUBLICATION_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateAffiliation = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: UPDATE_PUBLICATION,
    options: {
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
      onError: () => {
        sendErrorNotification(PUBLICATION_UPDATE_FAILED);
      },
    },
  });

  return {
    updateAffiliation: mutate,
    loading,
  };
};

export default useUpdateAffiliation;
