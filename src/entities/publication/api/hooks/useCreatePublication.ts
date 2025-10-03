import type { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { type BaseEditSectionProps, convertGToOz, convertMmToIn, NOTIFICATIONS } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { CREATE_PUBLICATION } from '../../model/publication.schema';
import { PublicationEntity } from '../../model/publication.types';

const { PUBLICATION_CREATION_FAILED } = NOTIFICATIONS;

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
    const { type, width, height, depth, weight, isbn } = data;

    mutate({
      variables: {
        data: {
          publicationType: type,
          workId,
          isbn: isbn && isbn.length > 0 ? isbn : null,
          widthMm: width && width > 0 ? width : null,
          widthIn: width && width > 0 ? convertMmToIn(width) : null,
          heightMm: height && height > 0 ? height : null,
          heightIn: height && height > 0 ? convertMmToIn(height) : null,
          depthMm: depth && depth > 0 ? depth : null,
          depthIn: depth && depth > 0 ? convertMmToIn(depth) : null,
          weightG: weight && weight > 0 ? weight : null,
          weightOz: weight && weight > 0 ? convertGToOz(weight) : null,
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
