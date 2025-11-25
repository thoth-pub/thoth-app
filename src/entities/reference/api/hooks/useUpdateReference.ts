import { ServerError } from '@apollo/client';

import { CreateAffiliationMutation } from '@/gql/graphql';
import { NOTIFICATIONS, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { ReferenceDtoMapper } from '../../model/reference.mapper';
import { UPDATE_REFERENCE } from '../../model/reference.schema';
import { ReferenceEntity } from '../../model/reference.types';

const { REFERENCE_UPDATE_FAILED } = NOTIFICATIONS;

const mapper = new ReferenceDtoMapper();

const useUpdateFunding = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: UPDATE_REFERENCE,
    options: {
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, REFERENCE_UPDATE_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(REFERENCE_UPDATE_FAILED);
      },
      refetchQueries: 'active',
    },
  });

  const updateReference = async (data: ReferenceEntity) => {
    const dto = mapper.toDto(data);

    await mutate({
      variables: { data: { ...dto, workId } },
    });
  };

  return {
    updateReference,
    loading,
  };
};

export default useUpdateFunding;
