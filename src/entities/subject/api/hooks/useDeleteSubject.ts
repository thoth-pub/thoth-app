'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import type { SubjectId } from '../../model/subject.types';

const { SUBJECT_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteSubject = (props: BaseEditSectionProps) => {
  const { queryToken } = props;

  const { sendErrorNotification } = useNotifications();
  const { subjectService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (subjectId: SubjectId) => {
      return subjectService.deleteSubject(queryToken, subjectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? SUBJECT_DELETE_FAILED);
    },
  });

  return {
    deleteSubject: mutateAsync,
    loading: isPending,
  };
};

export default useDeleteSubject;
