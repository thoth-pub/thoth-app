'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { SubjectEntity } from '../../model/subject.types';

const { SUBJECT_CREATION_FAILED } = NOTIFICATIONS;

const useCreateSubject = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { subjectService } = useServices();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();

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
