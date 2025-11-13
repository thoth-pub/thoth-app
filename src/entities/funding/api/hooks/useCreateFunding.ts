import { ServerError } from '@apollo/client';

import { CreateFundingMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { NOTIFICATIONS, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { FundingDtoMapper } from '../../model/funding.mapper';
import { CREATE_FUNDING } from '../../model/funding.schema';
import { FundingDto, FundingEntity } from '../../model/funding.types';
import { WorkId } from '@/src/entities/work/model/work.types';

const { FUNDING_CREATION_FAILED } = NOTIFICATIONS;

const mapper = new FundingDtoMapper();

const useCreateFunding = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading, client }] = useMutationWithAuth<CreateFundingMutation>({
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
      refetchQueries: workId.length > 0 ? [{ query: GET_WORK, variables: { workId } }] : [],
    },
  });

  const createFunding = async (
    data: Omit<FundingEntity, 'id' | 'institutionName' | 'institutionRor'>,
    relatedWorkId = workId,
  ) => {
    const { fundingId, ...dto } = mapper.toDto({ ...data, id: '', institutionName: '', institutionRor: '' });

    await mutate({
      variables: { data: { ...dto, workId: relatedWorkId } },
    });
  };

  const createFundingForMultipleWorks = async (data: {
    relatedWorkIds: WorkId[];
    funding: Omit<FundingEntity, 'id' | 'institutionName' | 'institutionRor'>;
  }) => {
    const { relatedWorkIds, funding } = data;
    const { fundingId, ...dto } = mapper.toDto({ ...funding, id: '', institutionName: '', institutionRor: '' });

    const promises = relatedWorkIds.map((relatedWorkId) => {
      return mutate({
        variables: { data: { ...dto, workId: relatedWorkId } },
      });
    });

    const results = await Promise.all(promises);

    if (results.some((result) => result.error)) return;

    return results.map((result) => mapper.toEntity(result.data?.createFunding as FundingDto));
  };

  return {
    createFunding,
    createFundingForMultipleWorks,
    loading,
  };
};

export default useCreateFunding;
