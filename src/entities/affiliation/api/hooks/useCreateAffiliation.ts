import type { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { type BaseEditSectionProps, NOTIFICATIONS } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { AffiliationDtoMapper } from '../../model/affiliation.mapper';
import { CREATE_AFFILIATION } from '../../model/affiliation.schema';
import { AffiliationDto, AffiliationEntity } from '../../model/affiliation.types';

const { AFFILIATION_CREATION_FAILED } = NOTIFICATIONS;

type UseCreateAffiliationProps = BaseEditSectionProps & {
  onCompleted?: (data: AffiliationEntity) => void;
};

const mapper = new AffiliationDtoMapper();

const useCreateAffiliation = (props: UseCreateAffiliationProps) => {
  const { queryToken, workId = '', onCompleted } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: CREATE_AFFILIATION,
    options: {
      onCompleted: (data: CreateAffiliationMutation) => {
        const affiliation = mapper.toEntity(data.createAffiliation as AffiliationDto);
        onCompleted?.(affiliation);
      },
      onError: (error) => {
        console.error(error);
        sendErrorNotification(AFFILIATION_CREATION_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  return {
    createAffiliation: mutate,
    loading,
  };
};

export default useCreateAffiliation;
