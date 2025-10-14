import { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { NOTIFICATIONS } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { DELETE_FUNDING } from '../../model/funding.schema';
import type { FundingId } from '../../model/funding.type';

const { FUNDING_DELETE_FAILED } = NOTIFICATIONS;

const useCreateFunding = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: DELETE_FUNDING,
    options: {
      onError: (error) => {
        console.error(error);
        sendErrorNotification(FUNDING_DELETE_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  const deleteFunding = (fundingId: FundingId) => {
    mutate({
      variables: { fundingId },
    });
  };

  return {
    deleteFunding,
    loading,
  };
};

export default useCreateFunding;
