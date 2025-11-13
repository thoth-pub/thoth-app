import { ServerError } from '@apollo/client';

import { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { NOTIFICATIONS, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { SubjectDtoMapper } from '../../model/subject.mapper';
import { UPDATE_SUBJECT } from '../../model/subject.schema';
import { SubjectEntity } from '../../model/subject.types';

const { SUBJECT_UPDATE_FAILED } = NOTIFICATIONS;

const mapper = new SubjectDtoMapper();

const useUpdateSubject = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: UPDATE_SUBJECT,
    options: {
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, SUBJECT_UPDATE_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(SUBJECT_UPDATE_FAILED);
      },
      refetchQueries: workId && workId.length > 0 ? [{ query: GET_WORK, variables: { workId } }] : [],
    },
  });

  const updateSubject = (data: SubjectEntity) => {
    const dto = mapper.toDto(data);

    mutate({
      variables: { data: { ...dto, workId } },
    });
  };

  return {
    updateSubject,
    loading,
  };
};

export default useUpdateSubject;
