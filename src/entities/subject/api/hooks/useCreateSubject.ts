import { ServerError } from '@apollo/client';

import { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { NOTIFICATIONS, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { SubjectDtoMapper } from '../../model/subject.mapper';
import { CREATE_SUBJECT } from '../../model/subject.schema';
import { SubjectEntity } from '../../model/subject.types';

const { SUBJECT_CREATION_FAILED } = NOTIFICATIONS;

const mapper = new SubjectDtoMapper();

const useCreateSubject = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: CREATE_SUBJECT,
    options: {
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, SUBJECT_CREATION_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(SUBJECT_CREATION_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  const createSubject = async (data: Omit<SubjectEntity, 'id'>, relatedWorkId = workId) => {
    const { subjectId, ...dto } = mapper.toDto({ ...data, id: '' });

    await mutate({
      variables: { data: { ...dto, workId: relatedWorkId } },
    });
  };

  return {
    createSubject,
    loading,
  };
};

export default useCreateSubject;
