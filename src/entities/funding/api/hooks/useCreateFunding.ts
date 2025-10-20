import { ServerError } from '@apollo/client';

import { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { NOTIFICATIONS, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { FundingDtoMapper } from '../../model/funding.mapper';
import { CREATE_FUNDING } from '../../model/funding.schema';
import { FundingEntity } from '../../model/funding.types';

const { FUNDING_CREATION_FAILED } = NOTIFICATIONS;

type UseCreateFundingProps = BaseEditSectionProps;

const mapper = new FundingDtoMapper();

const useCreateFunding = (props: UseCreateFundingProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: CREATE_FUNDING,
    options: {
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, FUNDING_CREATION_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(FUNDING_CREATION_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  const createFunding = (data: Omit<FundingEntity, 'id' | 'institutionName' | 'institutionRor'>) => {
    const { fundingId, ...dto } = mapper.toDto({ ...data, id: '', institutionName: '', institutionRor: '' });

    mutate({
      variables: { data: { ...dto, workId } },
    });
  };

  return {
    createFunding,
    loading,
  };
};

export default useCreateFunding;
