import type { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { type BaseEditSectionProps, NOTIFICATIONS } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { PublicationDtoMapper } from '../../model/publication.mapper';
import { CREATE_PUBLICATION } from '../../model/publication.schema';
import { PublicationEntity } from '../../model/publication.types';

const { PUBLICATION_CREATION_FAILED } = NOTIFICATIONS;

const mapper = new PublicationDtoMapper();

const useCreatePublication = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: CREATE_PUBLICATION,
    options: {
      onError: (error) => {
        console.error(error);
        sendErrorNotification(PUBLICATION_CREATION_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  const createPublication = (data: Omit<PublicationEntity, 'id'>) => {
    const { publicationId, ...dto } = mapper.toDto({ ...data, id: '' });

    mutate({
      variables: {
        data: {
          ...dto,
          workId,
        },
      },
    });
  };

  return {
    createPublication,
    loading,
  };
};

export default useCreatePublication;
