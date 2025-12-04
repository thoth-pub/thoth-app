'use client';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { SubjectEntity } from '../../model/subject.types';
import { SubjectService } from '../subject.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const { SUBJECT_CREATION_FAILED } = NOTIFICATIONS;

const subjectService = new SubjectService();

const useCreateSubject = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: SubjectEntity) => {
      return subjectService.createSubject(queryToken, data, workId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? SUBJECT_CREATION_FAILED);
    },
  });

  return {
    createSubject: mutateAsync,
    loading: isPending,
  };
};

export default useCreateSubject;
