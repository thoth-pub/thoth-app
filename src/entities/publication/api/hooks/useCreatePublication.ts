import { ServerError } from '@apollo/client';

import type { CreatePublicationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { type BaseEditSectionProps, NOTIFICATIONS, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { PublicationDtoMapper } from '../../model/publication.mapper';
import { CREATE_PUBLICATION } from '../../model/publication.schema';
import { PublicationDto, PublicationEntity } from '../../model/publication.types';

const { PUBLICATION_CREATION_FAILED } = NOTIFICATIONS;

type UseCreatePublicationProps = BaseEditSectionProps & {
  onCompleted?: (data: PublicationEntity) => void;
};

const mapper = new PublicationDtoMapper();

const useCreatePublication = (props: UseCreatePublicationProps) => {
  const { queryToken, workId = '', onCompleted } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreatePublicationMutation>({
    queryToken,
    mutation: CREATE_PUBLICATION,
    options: {
      onCompleted: (data: CreatePublicationMutation) => {
        const publication = mapper.toEntity(data.createPublication as PublicationDto);

        onCompleted?.(publication);
      },
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, PUBLICATION_CREATION_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

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
