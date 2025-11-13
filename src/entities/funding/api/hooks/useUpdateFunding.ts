import { ServerError } from '@apollo/client';

import { UpdateFundingMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { NOTIFICATIONS, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { FundingDtoMapper } from '../../model/funding.mapper';
import { UPDATE_FUNDING } from '../../model/funding.schema';
import { FundingEntity } from '../../model/funding.types';
import { WorkId } from '@/src/entities/work/model/work.types';

const { FUNDING_UPDATE_FAILED } = NOTIFICATIONS;

const mapper = new FundingDtoMapper();

const useUpdateFunding = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading, client }] = useMutationWithAuth<UpdateFundingMutation>({
    queryToken,
    mutation: UPDATE_FUNDING,
    options: {
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, FUNDING_UPDATE_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(FUNDING_UPDATE_FAILED);
      },
      refetchQueries: workId.length > 0 ? [{ query: GET_WORK, variables: { workId } }] : [],
    },
  });

  const updateFunding = async (data: FundingEntity, relatedWorkId: WorkId = workId) => {
    const dto = mapper.toDto(data);

    await mutate({
      variables: { data: { ...dto, workId: relatedWorkId } },
    });
  };

  const updateFundings = async (funding: FundingEntity, relatedWorkIds: WorkId[]) => {
    const dto = mapper.toDto(funding);

    const promises = relatedWorkIds.map((relatedWorkId) => {
      return mutate({
        variables: { data: { ...dto, workId: relatedWorkId } },
      });
    });

    await Promise.all(promises);

    await client.refetchQueries({ include: 'all' });
  };

  return {
    updateFunding,
    updateFundings,
    loading,
  };
};

export default useUpdateFunding;
