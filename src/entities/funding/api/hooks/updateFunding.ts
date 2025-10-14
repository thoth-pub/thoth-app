import { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { NOTIFICATIONS } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { FundingDtoMapper } from '../../model/funding.mapper';
import { UPDATE_FUNDING } from '../../model/funding.schema';
import { FundingEntity } from '../../model/funding.type';

const { FUNDING_UPDATE_FAILED } = NOTIFICATIONS;

const mapper = new FundingDtoMapper();

const useUpdateFunding = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: UPDATE_FUNDING,
    options: {
      onError: (error) => {
        console.error(error);
        sendErrorNotification(FUNDING_UPDATE_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  const updateFunding = (data: FundingEntity) => {
    const dto = mapper.toDto(data);

    mutate({
      variables: { data: { ...dto, workId } },
    });
  };

  return {
    updateFunding,
    loading,
  };
};

export default useUpdateFunding;
