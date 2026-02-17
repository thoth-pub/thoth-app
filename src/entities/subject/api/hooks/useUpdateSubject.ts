'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { SubjectEntity } from '../../model/subject.types';

const { SUBJECT_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateSubject = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { subjectService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: SubjectEntity) => {
      return subjectService.updateSubject(data, workId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? SUBJECT_UPDATE_FAILED);
    },
  });

  return {
    updateSubject: mutateAsync,
    loading: isPending,
  };
};

export default useUpdateSubject;
