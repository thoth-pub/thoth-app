import { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { NOTIFICATIONS } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { DELETE_FUNDING } from '../../model/funding.schema';
import type { FundingId } from '../../model/funding.types';

const { FUNDING_DELETE_FAILED } = NOTIFICATIONS;

const useCreateFunding = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading, client }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: DELETE_FUNDING,
    options: {
      onError: (error) => {
        console.error(error);
        sendErrorNotification(FUNDING_DELETE_FAILED);
      },
      refetchQueries: workId.length > 0 ? [{ query: GET_WORK, variables: { workId } }] : [],
    },
  });

  const deleteFunding = async (fundingId: FundingId) => {
    mutate({
      variables: { fundingId },
    });

    await client.refetchQueries({ include: 'active' });
  };

  const deleteFundings = async (fundingIds: FundingId[]) => {
    await Promise.all(fundingIds.map((fundingId) => mutate({ variables: { fundingId } })));
  };

  return {
    deleteFunding,
    deleteFundings,
    loading,
  };
};

export default useCreateFunding;
