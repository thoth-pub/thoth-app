import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { type SubjectId } from '../../model/subject.types';

const { SUBJECT_MOVE_FAILED } = NOTIFICATIONS;

const useMoveSubjects = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { subjectService } = useServices();
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ subjectId, newOrdinal }: { subjectId: SubjectId; newOrdinal: number }) => {
      return subjectService.moveSubject(subjectId, newOrdinal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? SUBJECT_MOVE_FAILED);
    },
  });

  return {
    moveSubjects: mutateAsync,
    loading: isPending,
  };
};

export default useMoveSubjects;
