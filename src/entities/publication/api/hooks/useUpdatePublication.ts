import type { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { type BaseEditSectionProps, NOTIFICATIONS } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { PublicationDtoMapper } from '../../model/publication.mapper';
import { UPDATE_PUBLICATION } from '../../model/publication.schema';
import { PublicationEntity } from '../../model/publication.types';

const { PUBLICATION_UPDATE_FAILED } = NOTIFICATIONS;

const mapper = new PublicationDtoMapper();

const useUpdateAffiliation = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: UPDATE_PUBLICATION,
    options: {
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
      onError: () => {
        sendErrorNotification(PUBLICATION_UPDATE_FAILED);
      },
    },
  });

  const updatePublication = (data: PublicationEntity) => {
    const dto = mapper.toDto(data);

    mutate({
      variables: { data: { ...dto, workId } },
    });
  };

  return {
    updatePublication,
    loading,
  };
};

export default useUpdateAffiliation;
