import { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { NOTIFICATIONS } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { DELETE_SUBJECT } from '../../model/subject.schema';
import type { SubjectId } from '../../model/subject.types';

const { SUBJECT_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteSubject = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: DELETE_SUBJECT,
    options: {
      onError: (error) => {
        console.error(error);
        sendErrorNotification(SUBJECT_DELETE_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  const deleteSubject = (subjectId: SubjectId) => {
    mutate({
      variables: { subjectId },
    });
  };

  return {
    deleteSubject,
    loading,
  };
};

export default useDeleteSubject;
