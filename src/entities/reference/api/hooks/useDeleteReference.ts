import { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { NOTIFICATIONS } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { DELETE_REFERENCE } from '../../model/reference.schema';
import type { ReferenceId } from '../../model/reference.types';

const { REFERENCE_DELETE_FAILED } = NOTIFICATIONS;

const useCreateReference = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: DELETE_REFERENCE,
    options: {
      onError: (error) => {
        console.error(error);
        sendErrorNotification(REFERENCE_DELETE_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  const deleteReference = (referenceId: ReferenceId) => {
    mutate({
      variables: { referenceId },
    });
  };

  return {
    deleteReference,
    loading,
  };
};

export default useCreateReference;
