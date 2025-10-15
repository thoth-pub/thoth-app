import { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { NOTIFICATIONS } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { ReferenceDtoMapper } from '../../model/reference.mapper';
import { CREATE_REFERENCE } from '../../model/reference.schema';
import { ReferenceEntity } from '../../model/reference.types';

const { REFERENCE_CREATION_FAILED } = NOTIFICATIONS;

const mapper = new ReferenceDtoMapper();

const useCreateReference = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: CREATE_REFERENCE,
    options: {
      onError: (error) => {
        console.error(error);
        sendErrorNotification(REFERENCE_CREATION_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  const createReference = (data: Omit<ReferenceEntity, 'id'>) => {
    const { referenceId, ...dto } = mapper.toDto({ ...data, id: '' });

    mutate({
      variables: { data: { ...dto, workId } },
    });
  };

  return {
    createReference,
    loading,
  };
};

export default useCreateReference;
