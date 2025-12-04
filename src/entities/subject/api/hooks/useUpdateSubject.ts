'use client';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { SubjectEntity } from '../../model/subject.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SubjectService } from '../subject.service';

const { SUBJECT_UPDATE_FAILED } = NOTIFICATIONS;

const subjectService = new SubjectService();

const useUpdateSubject = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: SubjectEntity) => {
      return subjectService.updateSubject(queryToken, data, workId);
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
