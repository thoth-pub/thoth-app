import { ServerError } from '@apollo/client';

import { CreateAffiliationMutation } from '@/gql/graphql';
import { NOTIFICATIONS, serverErrorParser } from '@/src/shared';
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
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, REFERENCE_CREATION_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(REFERENCE_CREATION_FAILED);
      },
      refetchQueries: 'active',
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
