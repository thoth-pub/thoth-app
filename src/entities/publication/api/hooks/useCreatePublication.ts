import type { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { type BaseEditSectionProps, NOTIFICATIONS } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { CREATE_PUBLICATION } from '../../model/publication.schema';

const { PUBLICATION_CREATION_FAILED } = NOTIFICATIONS;

const useCreatePublication = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: CREATE_PUBLICATION,
    options: {
      onError: (error) => {
        console.error(error);
        sendErrorNotification(PUBLICATION_CREATION_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  return {
    createAffiliation: mutate,
    loading,
  };
};

export default useCreatePublication;
